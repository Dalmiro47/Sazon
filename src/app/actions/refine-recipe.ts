'use server';

import { createGroqClient, GROQ_MODEL } from '@/lib/groq';
import { ALLOWED_CATEGORIES, ALLOWED_UNITS } from '@/types/constants';
import type { RecipePayload } from '@/types/recipe';

interface RefineResult {
  ok: true;
  recipe: RecipePayload;
}

interface RefineError {
  ok: false;
  message: string;
}

export async function refineRecipeAction(
  current: RecipePayload,
  modification: string
): Promise<RefineResult | RefineError> {
  let grok: ReturnType<typeof createGroqClient>;
  try {
    grok = createGroqClient();
  } catch {
    return { ok: false, message: 'La clave de API no está configurada' };
  }

  const systemPrompt = `Eres un asistente de recetas. El usuario tiene una receta y quiere modificarla. Devuelve la receta COMPLETA y ACTUALIZADA como JSON con este esquema exacto:
{
  "name": "string (2-300 chars, en español)",
  "category": "MUST be exactly one of: ${ALLOWED_CATEGORIES.join(', ')}",
  "servings": number,
  "ingredients": [{ "qty": number|null, "unit": "one of: ${ALLOWED_UNITS.join(', ')} or null", "name": "string", "note": "optional string" }],
  "steps": [{ "order": 1, "title": "string", "content": "string", "timer": 120 }],
  "tags": ["strings lowercase"],
  "notes": "optional string",
  "source": "Sugerida por IA",
  "calories_per_serving": number,
  "protein_per_serving": number,
  "fat_per_serving": number,
  "carbs_per_serving": number
}
Reglas:
- Aplica la modificación solicitada y recalcula macros si es necesario.
- Si qty es null, unit debe ser null.
- Steps deben ser secuenciales empezando en 1.
- El campo "timer" en los pasos es opcional: solo inclúyelo si el paso tiene un tiempo definido (segundos como entero); si no aplica, omite el campo.
- SIEMPRE incluye exactamente uno de los tags "fit" o "fat" (recalcula si la modificación cambia el perfil).
- Devuelve SOLO JSON válido, sin markdown ni texto extra. Todo en español.`;

  try {
    const response = await grok.chat.completions.create({
      model: GROQ_MODEL,
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `Receta actual:\n${JSON.stringify(current, null, 2)}\n\nModificación solicitada: ${modification}`,
        },
      ],
      temperature: 0.7,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) return { ok: false, message: 'Sin respuesta del modelo' };

    const jsonStr = content.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim();
    const recipe = JSON.parse(jsonStr) as RecipePayload;

    return { ok: true, recipe };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'Error al refinar la receta',
    };
  }
}
