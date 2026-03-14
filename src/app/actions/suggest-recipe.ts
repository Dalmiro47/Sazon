'use server';

import OpenAI from 'openai';
import { createClient } from '@/lib/supabase/server';
import type { RecipePayload } from '@/types/recipe';
import { ALLOWED_CATEGORIES, ALLOWED_UNITS } from '@/types/constants';

interface SuggestResult {
  ok: true;
  recipe: RecipePayload;
}

interface SuggestError {
  ok: false;
  message: string;
}

export async function suggestRecipeAction(
  constraint: string
): Promise<SuggestResult | SuggestError> {
  if (!process.env.GROK_API_KEY) {
    return { ok: false, message: 'La clave de API de Grok no está configurada' };
  }

  const grok = new OpenAI({
    apiKey: process.env.GROK_API_KEY,
    baseURL: 'https://api.groq.com/openai/v1',
  });

  // Fetch existing recipes for context (avoid duplicates)
  const supabase = createClient();
  const { data: existing } = await supabase
    .from('recipes')
    .select('name, category, tags')
    .is('deleted_at', null);

  const existingContext = existing?.length
    ? `Existing recipes (avoid duplicates):\n${existing.map((r) => `- ${r.name} (${r.category})`).join('\n')}`
    : 'No existing recipes yet.';

  const systemPrompt = `Eres un asistente de recetas para un hogar de dos personas. Todo el contenido debe estar en español. Usa unidades métricas (g, kg, ml, l, cdta, cda, taza, pieza, pizca). Devuelve una sola receta como JSON con este esquema exacto:
{
  "name": "string (2-300 chars, en español)",
  "category": "one of: ${ALLOWED_CATEGORIES.join(', ')}",
  "servings": 2,
  "ingredients": [{ "qty": number|null, "unit": "one of: ${ALLOWED_UNITS.join(', ')} or null", "name": "string en español", "note": "optional string en español" }],
  "steps": [{ "order": 1, "title": "string en español", "content": "string en español", "timer": optional_seconds }],
  "tags": ["strings en español, lowercase"],
  "notes": "optional tips en español",
  "source": "Sugerida por IA"
}
Reglas:
- Si qty es null, unit también debe ser null (significa "al gusto")
- El order de los pasos debe ser secuencial empezando en 1
- Que sea práctico y realizable en casa
- Devuelve SOLO JSON válido, sin bloques markdown ni texto extra
- Todo el texto debe estar en español`;

  try {
    const response = await grok.chat.completions.create({
      model: 'llama-3.3-70b-versatile',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `${existingContext}\n\nPetición: ${constraint || '¡Sorpréndeme con algo rico!'}`,
        },
      ],
      temperature: 0.8,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return { ok: false, message: 'Sin respuesta de Grok' };
    }

    // Parse JSON — handle potential markdown fences
    const jsonStr = content.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim();
    const recipe = JSON.parse(jsonStr) as RecipePayload;

    return { ok: true, recipe };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'Error al generar la sugerencia de receta',
    };
  }
}
