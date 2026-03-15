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
      errors.name = 'El nombre debe tener entre 2 y 300 caracteres';
    } else {
      cleaned.name = name;
    }
  } else if (mode === 'create') {
    errors.name = 'El nombre es requerido';
  }

  // --- category ---
  if (payload.category !== undefined) {
    const cat = payload.category.toLowerCase();
    if (!ALLOWED_CATEGORIES.includes(cat as typeof ALLOWED_CATEGORIES[number])) {
      errors.category = `La categoría debe ser una de: ${ALLOWED_CATEGORIES.join(', ')}`;
    } else {
      cleaned.category = cat;
    }
  } else if (mode === 'create') {
    errors.category = 'La categoría es requerida';
  }

  // --- servings ---
  if (payload.servings !== undefined) {
    const s = payload.servings;
    if (!Number.isInteger(s) || s < 1 || s > 100) {
      errors.servings = 'Las porciones deben ser un número entero entre 1 y 100';
    } else {
      cleaned.servings = s;
    }
  } else if (mode === 'create') {
    cleaned.servings = 2; // default — household of 2
  }

  // --- source ---
  if (payload.source !== undefined) {
    if (payload.source !== null && payload.source.length > 200) {
      errors.source = 'La fuente debe tener máximo 200 caracteres';
    } else {
      cleaned.source = payload.source;
    }
  }

  // --- notes ---
  if (payload.notes !== undefined) {
    if (payload.notes !== null && payload.notes.length > 10000) {
      errors.notes = 'Las notas deben tener máximo 10,000 caracteres';
    } else {
      cleaned.notes = payload.notes;
    }
  }

  // --- image_url ---
  if (payload.image_url !== undefined) {
    if (payload.image_url !== null) {
      if (payload.image_url.length > 2000) {
        errors.image_url = 'La URL de imagen debe tener máximo 2000 caracteres';
      } else if (!/^https?:\/\//.test(payload.image_url)) {
        errors.image_url = 'La URL de imagen debe empezar con http:// o https://';
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
      errors.tags = 'Las etiquetas deben ser un arreglo';
    } else {
      const deduplicated = Array.from(new Set(payload.tags.map((t) => t.toLowerCase().trim())));
      if (deduplicated.length > 20) {
        errors.tags = 'Máximo 20 etiquetas permitidas';
      } else {
        for (let i = 0; i < deduplicated.length; i++) {
          if (deduplicated[i].length < 1 || deduplicated[i].length > 50) {
            errors[`tags[${i}]`] = 'Cada etiqueta debe tener entre 1 y 50 caracteres';
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
      errors.ingredients = 'Los ingredientes deben ser un arreglo';
    } else if (payload.ingredients.length > 100) {
      errors.ingredients = 'Máximo 100 ingredientes permitidos';
    } else {
      const validatedIngredients: Ingredient[] = [];
      for (let i = 0; i < payload.ingredients.length; i++) {
        const ing = payload.ingredients[i];
        const prefix = `ingredients[${i}]`;

        // name
        if (!ing.name || ing.name.trim().length === 0) {
          errors[`${prefix}.name`] = 'El nombre es requerido y no debe estar vacío';
        } else if (ing.name.trim().length > 200) {
          errors[`${prefix}.name`] = 'El nombre debe tener máximo 200 caracteres';
        }

        // qty/unit invariant
        if (ing.qty === null && ing.unit !== null) {
          errors[`${prefix}.unit`] = 'La unidad debe ser nula cuando la cantidad es nula';
        }

        // unit validation
        if (ing.unit !== null && ing.unit !== undefined) {
          if (!ALLOWED_UNITS.includes(ing.unit as typeof ALLOWED_UNITS[number])) {
            errors[`${prefix}.unit`] =
              errors[`${prefix}.unit`] || `La unidad debe ser una de: ${ALLOWED_UNITS.join(', ')}`;
          }
        }

        // qty validation
        if (ing.qty !== null && ing.qty !== undefined) {
          if (typeof ing.qty !== 'number' || ing.qty <= 0) {
            errors[`${prefix}.qty`] = 'La cantidad debe ser un número positivo';
          }
        }

        // note validation
        if (ing.note !== undefined && ing.note !== null && ing.note.length > 500) {
          errors[`${prefix}.note`] = 'La nota debe tener máximo 500 caracteres';
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
      errors.steps = 'Los pasos deben ser un arreglo';
    } else if (payload.steps.length > 50) {
      errors.steps = 'Máximo 50 pasos permitidos';
    } else {
      const validatedSteps: RecipeStep[] = [];
      for (let i = 0; i < payload.steps.length; i++) {
        const step = payload.steps[i];
        const prefix = `steps[${i}]`;

        // title
        if (!step.title || step.title.trim().length === 0) {
          errors[`${prefix}.title`] = 'El título es requerido';
        } else if (step.title.trim().length > 150) {
          errors[`${prefix}.title`] = 'El título debe tener máximo 150 caracteres';
        }

        // content
        if (!step.content || step.content.trim().length === 0) {
          errors[`${prefix}.content`] = 'El contenido es requerido';
        } else if (step.content.trim().length > 5000) {
          errors[`${prefix}.content`] = 'El contenido debe tener máximo 5000 caracteres';
        }

        // timer
        if (step.timer !== undefined && step.timer !== null) {
          if (!Number.isInteger(step.timer) || step.timer < 1 || step.timer > 86400) {
            errors[`${prefix}.timer`] = 'El temporizador debe ser un entero entre 1 y 86400 segundos';
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

  // --- macros ---
  const macroFields = [
    'calories_per_serving',
    'protein_per_serving',
    'fat_per_serving',
    'carbs_per_serving',
  ] as const;

  for (const field of macroFields) {
    const val = payload[field];
    if (val !== undefined) {
      if (val !== null && (typeof val !== 'number' || val < 0)) {
        errors[field] = 'Debe ser un número mayor o igual a 0';
      } else {
        cleaned[field] = val;
      }
    }
  }

  // --- return ---
  const errorCount = Object.keys(errors).length;
  if (errorCount > 0) {
    return {
      ok: false,
      code: 'VALIDATION_ERROR',
      message: `${errorCount} error${errorCount > 1 ? 'es' : ''} de validación`,
      fields: errors,
    };
  }

  return { ok: true, data: cleaned };
}
