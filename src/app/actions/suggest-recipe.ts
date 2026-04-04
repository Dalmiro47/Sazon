'use server';

import { createGroqClient, GROQ_MODEL } from '@/lib/groq';
import { createClient } from '@/lib/supabase/server';
import type { RecipePayload } from '@/types/recipe';
import { ALLOWED_CATEGORIES, ALLOWED_UNITS, CATEGORY_LABELS } from '@/types/constants';
import type { Category } from '@/types/constants';

interface SuggestResult {
  ok: true;
  recipe: RecipePayload;
}

interface SuggestError {
  ok: false;
  message: string;
}

export interface SuggestParams {
  constraint: string;
  fitFat?: 'fit' | 'fat';
  category?: string;
}

export async function suggestRecipeAction(
  params: SuggestParams
): Promise<SuggestResult | SuggestError> {
  const { constraint, fitFat, category } = params;
  let grok: ReturnType<typeof createGroqClient>;
  try {
    grok = createGroqClient();
  } catch {
    return { ok: false, message: 'La clave de API no está configurada' };
  }

  // Fetch existing recipes for context
  const supabase = createClient();
  let query = supabase.from('recipes').select('name, category, tags').is('deleted_at', null);
  if (category) query = query.eq('category', category);
  if (fitFat) query = query.contains('tags', [fitFat]);
  const { data: existing } = await query;

  const existingContext = existing?.length
    ? `Recetas existentes del hogar con perfil similar (evita duplicados, úsalas para inferir gustos):\n${existing.map((r) => `- ${r.name} (${r.category}) [${r.tags?.join(', ') ?? ''}]`).join('\n')}`
    : 'No hay recetas existentes con ese perfil aún.';

  const systemPrompt = `Eres un asistente de recetas para un hogar de dos personas. Todo el contenido debe estar en español. Usa unidades métricas (g, kg, ml, l, cdta, cda, taza, pieza, pizca). Devuelve una sola receta como JSON con este esquema exacto:
{
  "name": "string (2-300 chars, en español)",
  "category": "MUST be exactly one of these strings: ${ALLOWED_CATEGORIES.join(', ')}",
  "servings": 2,
  "ingredients": [{ "qty": number|null, "unit": "one of: ${ALLOWED_UNITS.join(', ')} or null", "name": "string en español", "note": "optional string en español" }],
  "steps": [{ "order": 1, "title": "string en español", "content": "string en español", "timer": 120 }],
  "tags": ["strings en español, lowercase"],
  "notes": "optional tips en español",
  "source": "Sugerida por IA",
  "calories_per_serving": number,
  "protein_per_serving": number (gramos),
  "fat_per_serving": number (gramos),
  "carbs_per_serving": number (gramos)
}
Reglas:
- Si qty es null, unit también debe ser null (significa "al gusto")
- El order de los pasos debe ser secuencial empezando en 1
- El campo "timer" en los pasos es opcional: inclúyelo solo si el paso tiene un tiempo definido (número entero de segundos); si no aplica, omite el campo completamente
- Que sea práctico y realizable en casa
- SIEMPRE agrega EXACTAMENTE uno de estos dos tags: "fit" o "fat". Criterios estrictos:
  • "fat" si cumple CUALQUIERA: >450 kcal/porción, >20g grasa/porción, contiene chocolate/nutella/crema/mantequilla en cantidad significativa, frituras, pasteles, postres con azúcar, quesos grasos, embutidos.
  • "fit" solo si: ≤450 kcal/porción Y ≤20g grasa/porción Y es principalmente proteína magra, verduras, legumbres o granos integrales sin frituras.
  • En caso de duda, elige "fat". Nunca pongas ambos.
- Macros POR PORCION: calcula paso a paso, no estimes el plato completo de golpe.
  a) Para cada ingrediente con qty, estima sus macros usando valores USDA de referencia:
     Pechuga pollo cruda 100g = 165 kcal | 31g prot | 3.6g grasa | 0g carbs
     Carne molida 80% magra 100g = 215 kcal | 26g prot | 12g grasa | 0g carbs
     Arroz cocido 100g = 130 kcal | 2.5g prot | 0.3g grasa | 28g carbs
     Papa cocida 100g = 87 kcal | 2g prot | 0.1g grasa | 20g carbs
     Aceite (cualquier tipo) 1 cda (14g) = 120 kcal | 0g prot | 14g grasa | 0g carbs
     Huevo entero 1 pieza (50g) = 72 kcal | 6g prot | 5g grasa | 0.4g carbs
     Harina de trigo 100g = 364 kcal | 10g prot | 1g grasa | 76g carbs
     Leche entera 100ml = 61 kcal | 3.2g prot | 3.3g grasa | 4.8g carbs
     Mantequilla 100g = 717 kcal | 0.9g prot | 81g grasa | 0.1g carbs
     Queso fresco 100g = 264 kcal | 18g prot | 21g grasa | 1g carbs
  b) Suma los macros de todos los ingredientes (total receta)
  c) DIVIDE entre servings para obtener el valor POR PORCION
  d) Prefiere quedar corto a sobreestimar si no tienes datos exactos.
- Devuelve SOLO JSON válido, sin bloques markdown ni texto extra
- Todo el texto debe estar en español`;

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
      temperature: 0.8,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return { ok: false, message: 'Sin respuesta del modelo' };
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
