'use server';

import { createGroqClient, GROQ_MODEL } from '@/lib/groq';
import { createClient } from '@/lib/supabase/server';
import { CATEGORY_LABELS } from '@/types/constants';
import type { Category } from '@/types/constants';
import type { SuggestParams } from '@/app/actions/suggest-recipe';

export interface RecipeIdea {
  name: string;
  description: string;
  tag: 'fit' | 'fat';
  category: string;
}

interface IdeasResult {
  ok: true;
  ideas: RecipeIdea[];
}

interface IdeasError {
  ok: false;
  message: string;
}

export async function suggestIdeasAction(
  params: SuggestParams
): Promise<IdeasResult | IdeasError> {
  const { constraint, fitFat, category } = params;

  let grok: ReturnType<typeof createGroqClient>;
  try {
    grok = createGroqClient();
  } catch {
    return { ok: false, message: 'La clave de API no está configurada' };
  }

  // Fetch existing recipes for context (avoid duplicates, infer tastes)
  const supabase = createClient();
  let query = supabase.from('recipes').select('name, category, tags').is('deleted_at', null);
  if (category) query = query.eq('category', category);
  if (fitFat) query = query.contains('tags', [fitFat]);
  const { data: existing } = await query;

  const existingContext = existing?.length
    ? `Recetas existentes del hogar con perfil similar (evita duplicados, úsalas para inferir gustos):\n${existing.map((r) => `- ${r.name} (${r.category}) [${r.tags?.join(', ') ?? ''}]`).join('\n')}`
    : 'No hay recetas existentes con ese perfil aún.';

  const systemPrompt = `Eres un asistente de recetas para un hogar de dos personas. Propón exactamente 3 ideas de recetas distintas como JSON array:
[
  { "name": "string en español", "description": "una sola frase en español que describa el plato de forma apetecible", "tag": "fit" | "fat", "category": "main|starter|dessert|snack|breakfast|side|sauce|drink" },
  ...
]
Criterio fit/fat:
- "fat": >450 kcal/porción estimadas, OR >20g grasa, OR ingredientes indulgentes (crema, chocolate, frituras, quesos grasos).
- "fit": ≤450 kcal Y ≤20g grasa Y principalmente proteína magra, verduras, legumbres o integrales.
- En duda: "fat".
Reglas: devuelve SOLO JSON válido, sin texto extra ni markdown. Todo en español.`;

  try {
    const response = await grok.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: [
            existingContext,
            fitFat ? `Perfil deseado: "${fitFat}" (${fitFat === 'fit' ? 'saludable, bajo en calorías/grasa' : 'indulgente, rico, sin restricciones'})` : '',
            category ? `Categoría deseada: ${CATEGORY_LABELS[category as Category] ?? category}` : '',
            `Petición: ${constraint || '¡Sorpréndeme con algo rico!'}`,
          ].filter(Boolean).join('\n\n'),
        },
      ],
      temperature: 0.9,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return { ok: false, message: 'Sin respuesta del modelo' };

    const jsonStr = content.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim();
    const ideas = JSON.parse(jsonStr) as RecipeIdea[];

    return { ok: true, ideas };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'Error al generar ideas',
    };
  }
}
