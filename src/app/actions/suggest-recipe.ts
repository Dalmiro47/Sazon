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
    return { ok: false, message: 'Grok API key not configured' };
  }

  const grok = new OpenAI({
    apiKey: process.env.GROK_API_KEY,
    baseURL: 'https://api.x.ai/v1',
  });

  // Fetch existing recipes for context (avoid duplicates)
  const supabase = createClient();
  const { data: existing } = await supabase
    .from('recipes')
    .select('name, category, tags');

  const existingContext = existing?.length
    ? `Existing recipes (avoid duplicates):\n${existing.map((r) => `- ${r.name} (${r.category})`).join('\n')}`
    : 'No existing recipes yet.';

  const systemPrompt = `You are a recipe assistant for a household of two. Return a single recipe as JSON matching this exact schema:
{
  "name": "string (2-300 chars)",
  "category": "one of: ${ALLOWED_CATEGORIES.join(', ')}",
  "servings": 2,
  "ingredients": [{ "qty": number|null, "unit": "one of: ${ALLOWED_UNITS.join(', ')} or null", "name": "string", "note": "optional string" }],
  "steps": [{ "order": 1, "title": "string", "content": "string", "timer": optional_seconds }],
  "tags": ["lowercase strings"],
  "notes": "optional tips",
  "source": "AI suggested"
}
Rules:
- If qty is null, unit must also be null (means "to taste")
- Steps order should be sequential starting from 1
- Keep it practical and achievable at home
- Return ONLY valid JSON, no markdown fences or extra text`;

  try {
    const response = await grok.chat.completions.create({
      model: 'grok-3-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        {
          role: 'user',
          content: `${existingContext}\n\nConstraint: ${constraint || 'Surprise me with something tasty!'}`,
        },
      ],
      temperature: 0.8,
    });

    const content = response.choices[0]?.message?.content;
    if (!content) {
      return { ok: false, message: 'No response from Grok' };
    }

    // Parse JSON — handle potential markdown fences
    const jsonStr = content.replace(/```json?\n?/g, '').replace(/```\n?/g, '').trim();
    const recipe = JSON.parse(jsonStr) as RecipePayload;

    return { ok: true, recipe };
  } catch (err) {
    return {
      ok: false,
      message: err instanceof Error ? err.message : 'Failed to generate recipe suggestion',
    };
  }
}
