'use server';

import { YoutubeTranscript } from 'youtube-transcript';
import { createGroqClient, GROQ_MODEL, GROQ_VISION_MODEL } from '@/lib/groq';
import { buildImportSystemPrompt } from '@/lib/import-recipe-prompt';
import { htmlToText } from '@/lib/html-to-text';
import { sanitizeImportedRecipe } from '@/lib/sanitize-import';
import type { RecipePayload } from '@/types/recipe';

interface ImportSuccess {
  ok: true;
  recipe: RecipePayload;
}

interface ImportError {
  ok: false;
  message: string;
}

type ImportResult = ImportSuccess | ImportError;

function extractYouTubeId(url: string): string | null {
  const match = url.match(
    /(?:youtube\.com\/watch\?v=|youtu\.be\/)([A-Za-z0-9_-]{11})/
  );
  return match?.[1] ?? null;
}

async function fetchYouTubeText(videoId: string): Promise<string | null> {
  try {
    // Try Spanish first, fallback to any language
    const segments = await YoutubeTranscript.fetchTranscript(videoId, { lang: 'es' })
      .catch(() => YoutubeTranscript.fetchTranscript(videoId));
    if (!segments?.length) return null;
    return segments.map((s) => s.text).join(' ').slice(0, 8000);
  } catch {
    return null;
  }
}

function parseRecipeJson(content: string): RecipePayload {
  let jsonStr = content.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim();

  // If response starts with non-JSON, it's likely a text response - try to extract JSON object
  if (!jsonStr.startsWith('{')) {
    const jsonMatch = jsonStr.match(/\{[\s\S]*\}/);
    if (!jsonMatch) {
      throw new Error('No JSON found in response');
    }
    jsonStr = jsonMatch[0];
  }

  // Fix smart quotes and common character issues
  jsonStr = jsonStr
    .replace(/[""]/g, '"')  // smart quotes to straight
    .replace(/['']/g, "'")  // smart single quotes to straight
    .replace(/…/g, '...')   // ellipsis to three dots
    .replace(/–/g, '-')     // en-dash to hyphen
    .replace(/—/g, '-');    // em-dash to hyphen

  const raw = JSON.parse(jsonStr) as RecipePayload;
  const sanitized = sanitizeImportedRecipe(raw);

  // Validate that the recipe has meaningful content
  const hasValidName = sanitized.name?.trim() && sanitized.name.trim().length >= 2;
  const hasIngredients = sanitized.ingredients && sanitized.ingredients.length > 0;
  const hasSteps = sanitized.steps && sanitized.steps.length > 0;

  if (!hasValidName || !hasIngredients || !hasSteps) {
    throw new Error(
      'No se pudo extraer una receta válida. Asegúrate de que la fuente contiene ingredientes, pasos e instrucciones.'
    );
  }

  return sanitized;
}

export async function importFromImageAction(base64Image: string): Promise<ImportResult> {
  if (!base64Image) {
    return { ok: false, message: 'No se proporcionó ninguna imagen' };
  }

  // Validate size (~4MB raw)
  if (base64Image.length * 0.75 > 4_000_000) {
    return { ok: false, message: 'La imagen es demasiado grande (máximo 4MB)' };
  }

  let groq: ReturnType<typeof createGroqClient>;
  try {
    groq = createGroqClient();
  } catch {
    return { ok: false, message: 'La clave de API no está configurada' };
  }

  try {
    const response = await groq.chat.completions.create({
      model: GROQ_VISION_MODEL,
      messages: [
        { role: 'system', content: buildImportSystemPrompt('photo') },
        {
          role: 'user',
          content: [
            {
              type: 'image_url',
              image_url: { url: `data:image/jpeg;base64,${base64Image}` },
            },
            { type: 'text', text: 'Extrae la receta de esta imagen.' },
          ],
        },
      ],
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return { ok: false, message: 'Sin respuesta del modelo' };
    }

    return { ok: true, recipe: parseRecipeJson(content) };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'Error al extraer la receta de la imagen',
    };
  }
}

export async function importFromUrlAction(url: string): Promise<ImportResult> {
  if (!url.trim()) {
    return { ok: false, message: 'No se proporcionó ningún enlace' };
  }

  if (!/^https?:\/\//.test(url)) {
    return { ok: false, message: 'El enlace debe empezar con http:// o https://' };
  }

  let groq: ReturnType<typeof createGroqClient>;
  try {
    groq = createGroqClient();
  } catch {
    return { ok: false, message: 'La clave de API no está configurada' };
  }

  // Check if URL is a YouTube video
  const ytId = extractYouTubeId(url);
  if (ytId) {
    const transcript = await fetchYouTubeText(ytId);
    if (!transcript) {
      return {
        ok: false,
        message:
          'No se encontró transcripción en este video. Probá pegando la receta como texto o selecciona otro video con subtítulos.',
      };
    }

    try {
      const response = await groq.chat.completions.create({
        model: GROQ_MODEL,
        messages: [
          { role: 'system', content: buildImportSystemPrompt('link') },
          {
            role: 'user',
            content: `Transcripción del video de YouTube:\n\n${transcript}\n\nExtrae la receta de esta transcripción.`,
          },
        ],
        temperature: 0.3,
      });

      const content = response.choices[0]?.message?.content;
      if (!content) {
        return { ok: false, message: 'Sin respuesta del modelo' };
      }

      return { ok: true, recipe: parseRecipeJson(content) };
    } catch (err) {
      return {
        ok: false,
        message: err instanceof Error ? err.message : 'Error al extraer la receta del video',
      };
    }
  }

  // Generic URL handler (non-YouTube)
  let pageText: string;
  try {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), 10_000);

    const res = await fetch(url, {
      signal: controller.signal,
      headers: { 'User-Agent': 'Sazon-Recipe-Importer/1.0' },
    });
    clearTimeout(timeout);

    const contentType = res.headers.get('content-type') ?? '';
    if (!contentType.includes('text/html') && !contentType.includes('text/plain')) {
      return { ok: false, message: 'El enlace no apunta a una página web válida' };
    }

    const html = await res.text();
    pageText = htmlToText(html);

    if (pageText.length < 50) {
      return { ok: false, message: 'No se pudo extraer contenido suficiente de la página' };
    }
  } catch (err) {
    if (err instanceof DOMException && err.name === 'AbortError') {
      return { ok: false, message: 'El enlace tardó demasiado en responder' };
    }
    return { ok: false, message: 'No se pudo acceder al enlace proporcionado' };
  }

  try {
    const response = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: buildImportSystemPrompt('link') },
        {
          role: 'user',
          content: `Contenido de la página web:\n\n${pageText}\n\nExtrae la receta de este contenido.`,
        },
      ],
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return { ok: false, message: 'Sin respuesta del modelo' };
    }

    return { ok: true, recipe: parseRecipeJson(content) };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'Error al extraer la receta del enlace',
    };
  }
}

export async function importFromTextAction(text: string): Promise<ImportResult> {
  if (!text.trim()) {
    return { ok: false, message: 'No se proporcionó ningún texto' };
  }

  if (text.length > 10_000) {
    return { ok: false, message: 'El texto es demasiado largo (máximo 10,000 caracteres)' };
  }

  let groq: ReturnType<typeof createGroqClient>;
  try {
    groq = createGroqClient();
  } catch {
    return { ok: false, message: 'La clave de API no está configurada' };
  }

  try {
    const response = await groq.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: buildImportSystemPrompt('text') },
        {
          role: 'user',
          content: `Texto proporcionado:\n\n${text}\n\nExtrae la receta de este texto.`,
        },
      ],
      temperature: 0.3,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return { ok: false, message: 'Sin respuesta del modelo' };
    }

    return { ok: true, recipe: parseRecipeJson(content) };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'Error al extraer la receta del texto',
    };
  }
}
