'use server';

import { createClient } from '@/lib/supabase/server';
import { slugify } from '@/lib/slugify';
import { validateRecipePayload } from '@/lib/validate-recipe';
import type { ActionResult } from '@/types/actions';
import type { Recipe, RecipePayload } from '@/types/recipe';
import { SupabaseClient } from '@supabase/supabase-js';

/**
 * Resolve a unique slug by appending -2, -3, ... if collision detected.
 * Falls back to UNIQUE constraint catch for race conditions.
 */
async function resolveSlug(
  baseSlug: string,
  supabase: SupabaseClient
): Promise<string> {
  let candidate = baseSlug;
  let suffix = 1;

  while (suffix <= 100) {
    const { data } = await supabase
      .from('recipes')
      .select('id')
      .eq('slug', candidate)
      .maybeSingle();

    if (!data) return candidate;
    suffix++;
    candidate = `${baseSlug}-${suffix}`;
  }

  throw new Error('Slug collision limit exceeded');
}

/** Strip fields that must never be part of an UPDATE write. */
function stripImmutableFields(
  payload: Record<string, unknown>
): Record<string, unknown> {
  const cleaned = { ...payload };
  delete cleaned.id;
  delete cleaned.slug;
  delete cleaned.created_at;
  delete cleaned.updated_at;
  return cleaned;
}

export async function upsertRecipeAction(
  payload: RecipePayload
): Promise<ActionResult> {
  // TODO: requireAuth()

  const supabase = createClient();

  // --- Determine mode ---
  const isUpdate = !!payload.id;
  const mode = isUpdate ? 'update' : 'create';

  // --- Validate ---
  const validation = validateRecipePayload(payload, mode as 'create' | 'update');
  if (!validation.ok) {
    return validation;
  }

  const cleanedData = validation.data;

  try {
    if (isUpdate) {
      // UPDATE by id
      const { data: existing } = await supabase
        .from('recipes')
        .select('id')
        .eq('id', payload.id!)
        .maybeSingle();

      if (!existing) {
        return {
          ok: false,
          code: 'NOT_FOUND',
          message: `Recipe with id '${payload.id}' not found`,
        };
      }

      const writePayload = stripImmutableFields(
        cleanedData as unknown as Record<string, unknown>
      );

      // Only write if there are fields to update
      if (Object.keys(writePayload).length === 0) {
        // Nothing to update — return the existing record
        const { data: recipe } = await supabase
          .from('recipes')
          .select('*')
          .eq('id', payload.id!)
          .single();

        return { ok: true, recipe: recipe as Recipe, operation: 'updated' };
      }

      const { data: recipe, error } = await supabase
        .from('recipes')
        .update(writePayload)
        .eq('id', payload.id!)
        .select()
        .single();

      if (error) {
        return { ok: false, code: 'DB_ERROR', message: error.message };
      }

      return { ok: true, recipe: recipe as Recipe, operation: 'updated' };
    } else {
      // CREATE
      if (!cleanedData.name) {
        return {
          ok: false,
          code: 'VALIDATION_ERROR',
          message: 'name is required for creating a recipe',
        };
      }

      const baseSlug = slugify(cleanedData.name);
      if (!baseSlug) {
        return {
          ok: false,
          code: 'VALIDATION_ERROR',
          message: 'name must produce a valid slug',
        };
      }

      const slug = await resolveSlug(baseSlug, supabase);

      const insertPayload = {
        ...cleanedData,
        slug,
      };

      // Strip any immutable fields that shouldn't be in INSERT
      delete insertPayload.id;

      const { data: recipe, error } = await supabase
        .from('recipes')
        .insert(insertPayload)
        .select()
        .single();

      if (error) {
        // Handle race condition: slug unique violation → retry once
        if (error.code === '23505' && error.message.includes('slug')) {
          const retrySlug = await resolveSlug(baseSlug, supabase);
          insertPayload.slug = retrySlug;

          const { data: retryRecipe, error: retryError } = await supabase
            .from('recipes')
            .insert(insertPayload)
            .select()
            .single();

          if (retryError) {
            return { ok: false, code: 'DB_ERROR', message: retryError.message };
          }

          return {
            ok: true,
            recipe: retryRecipe as Recipe,
            operation: 'created',
          };
        }

        return { ok: false, code: 'DB_ERROR', message: error.message };
      }

      return { ok: true, recipe: recipe as Recipe, operation: 'created' };
    }
  } catch (err) {
    return {
      ok: false,
      code: 'DB_ERROR',
      message: err instanceof Error ? err.message : 'Unknown error',
    };
  }
}
