import { ALLOWED_CATEGORIES, ALLOWED_UNITS } from '@/types/constants';
import type { Ingredient, RecipeStep, RecipePayload } from '@/types/recipe';

interface ValidationSuccess {
  ok: true;
  data: RecipePayload;
}

interface ValidationError {
  ok: false;
  code: 'VALIDATION_ERROR';
  message: string;
  fields: Record<string, string>;
}

export type ValidationResult = ValidationSuccess | ValidationError;

export function validateRecipePayload(
  payload: RecipePayload,
  mode: 'create' | 'update'
): ValidationResult {
  const errors: Record<string, string> = {};
  const cleaned: RecipePayload = {};

  // --- name ---
  if (payload.name !== undefined) {
    const name = payload.name.trim();
    if (name.length < 2 || name.length > 300) {
      errors.name = 'name must be between 2 and 300 characters';
    } else {
      cleaned.name = name;
    }
  } else if (mode === 'create') {
    errors.name = 'name is required';
  }

  // --- category ---
  if (payload.category !== undefined) {
    const cat = payload.category.toLowerCase();
    if (!ALLOWED_CATEGORIES.includes(cat as typeof ALLOWED_CATEGORIES[number])) {
      errors.category = `category must be one of: ${ALLOWED_CATEGORIES.join(', ')}`;
    } else {
      cleaned.category = cat;
    }
  } else if (mode === 'create') {
    errors.category = 'category is required';
  }

  // --- servings ---
  if (payload.servings !== undefined) {
    const s = payload.servings;
    if (!Number.isInteger(s) || s < 1 || s > 100) {
      errors.servings = 'servings must be an integer between 1 and 100';
    } else {
      cleaned.servings = s;
    }
  } else if (mode === 'create') {
    cleaned.servings = 2; // default — household of 2
  }

  // --- source ---
  if (payload.source !== undefined) {
    if (payload.source !== null && payload.source.length > 200) {
      errors.source = 'source must be at most 200 characters';
    } else {
      cleaned.source = payload.source;
    }
  }

  // --- notes ---
  if (payload.notes !== undefined) {
    if (payload.notes !== null && payload.notes.length > 10000) {
      errors.notes = 'notes must be at most 10,000 characters';
    } else {
      cleaned.notes = payload.notes;
    }
  }

  // --- image_url ---
  if (payload.image_url !== undefined) {
    if (payload.image_url !== null) {
      if (payload.image_url.length > 2000) {
        errors.image_url = 'image_url must be at most 2000 characters';
      } else if (!/^https?:\/\//.test(payload.image_url)) {
        errors.image_url = 'image_url must start with http:// or https://';
      } else {
        cleaned.image_url = payload.image_url;
      }
    } else {
      cleaned.image_url = null;
    }
  }

  // --- tags ---
  if (payload.tags !== undefined) {
    if (!Array.isArray(payload.tags)) {
      errors.tags = 'tags must be an array';
    } else {
      const deduplicated = Array.from(new Set(payload.tags.map((t) => t.toLowerCase().trim())));
      if (deduplicated.length > 20) {
        errors.tags = 'maximum 20 tags allowed';
      } else {
        for (let i = 0; i < deduplicated.length; i++) {
          if (deduplicated[i].length < 1 || deduplicated[i].length > 50) {
            errors[`tags[${i}]`] = 'each tag must be between 1 and 50 characters';
          }
        }
        if (!Object.keys(errors).some((k) => k.startsWith('tags'))) {
          cleaned.tags = deduplicated;
        }
      }
    }
  }

  // --- ingredients ---
  if (payload.ingredients !== undefined) {
    if (!Array.isArray(payload.ingredients)) {
      errors.ingredients = 'ingredients must be an array';
    } else if (payload.ingredients.length > 100) {
      errors.ingredients = 'maximum 100 ingredients allowed';
    } else {
      const validatedIngredients: Ingredient[] = [];
      for (let i = 0; i < payload.ingredients.length; i++) {
        const ing = payload.ingredients[i];
        const prefix = `ingredients[${i}]`;

        // name
        if (!ing.name || ing.name.trim().length === 0) {
          errors[`${prefix}.name`] = 'name is required and must not be empty';
        } else if (ing.name.trim().length > 200) {
          errors[`${prefix}.name`] = 'name must be at most 200 characters';
        }

        // qty/unit invariant
        if (ing.qty === null && ing.unit !== null) {
          errors[`${prefix}.unit`] = 'unit must be null when qty is null';
        }

        // unit validation
        if (ing.unit !== null && ing.unit !== undefined) {
          if (!ALLOWED_UNITS.includes(ing.unit as typeof ALLOWED_UNITS[number])) {
            errors[`${prefix}.unit`] =
              errors[`${prefix}.unit`] || `unit must be one of: ${ALLOWED_UNITS.join(', ')}`;
          }
        }

        // qty validation
        if (ing.qty !== null && ing.qty !== undefined) {
          if (typeof ing.qty !== 'number' || ing.qty <= 0) {
            errors[`${prefix}.qty`] = 'qty must be a positive number';
          }
        }

        // note validation
        if (ing.note !== undefined && ing.note !== null && ing.note.length > 500) {
          errors[`${prefix}.note`] = 'note must be at most 500 characters';
        }

        if (!Object.keys(errors).some((k) => k.startsWith(prefix))) {
          validatedIngredients.push({
            qty: ing.qty ?? null,
            unit: ing.unit ?? null,
            name: ing.name.trim(),
            ...(ing.note ? { note: ing.note } : {}),
          });
        }
      }
      if (!Object.keys(errors).some((k) => k.startsWith('ingredients'))) {
        cleaned.ingredients = validatedIngredients;
      }
    }
  }

  // --- steps ---
  if (payload.steps !== undefined) {
    if (!Array.isArray(payload.steps)) {
      errors.steps = 'steps must be an array';
    } else if (payload.steps.length > 50) {
      errors.steps = 'maximum 50 steps allowed';
    } else {
      const validatedSteps: RecipeStep[] = [];
      for (let i = 0; i < payload.steps.length; i++) {
        const step = payload.steps[i];
        const prefix = `steps[${i}]`;

        // title
        if (!step.title || step.title.trim().length === 0) {
          errors[`${prefix}.title`] = 'title is required';
        } else if (step.title.trim().length > 150) {
          errors[`${prefix}.title`] = 'title must be at most 150 characters';
        }

        // content
        if (!step.content || step.content.trim().length === 0) {
          errors[`${prefix}.content`] = 'content is required';
        } else if (step.content.trim().length > 5000) {
          errors[`${prefix}.content`] = 'content must be at most 5000 characters';
        }

        // timer
        if (step.timer !== undefined && step.timer !== null) {
          if (!Number.isInteger(step.timer) || step.timer < 1 || step.timer > 86400) {
            errors[`${prefix}.timer`] = 'timer must be an integer between 1 and 86400 seconds';
          }
        }

        if (!Object.keys(errors).some((k) => k.startsWith(prefix))) {
          validatedSteps.push({
            order: i + 1, // renormalize to 1-indexed
            title: step.title.trim(),
            content: step.content.trim(),
            ...(step.timer ? { timer: step.timer } : {}),
          });
        }
      }
      if (!Object.keys(errors).some((k) => k.startsWith('steps'))) {
        cleaned.steps = validatedSteps;
      }
    }
  }

  // --- return ---
  const errorCount = Object.keys(errors).length;
  if (errorCount > 0) {
    return {
      ok: false,
      code: 'VALIDATION_ERROR',
      message: `${errorCount} validation error${errorCount > 1 ? 's' : ''}`,
      fields: errors,
    };
  }

  return { ok: true, data: cleaned };
}
