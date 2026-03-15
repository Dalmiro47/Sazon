-- Add macro columns to recipes (nullable — existing recipes unaffected)
ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS calories_per_serving numeric
      CHECK (calories_per_serving IS NULL OR calories_per_serving >= 0),
        ADD COLUMN IF NOT EXISTS protein_per_serving numeric
            CHECK (protein_per_serving IS NULL OR protein_per_serving >= 0),
              ADD COLUMN IF NOT EXISTS fat_per_serving numeric
                  CHECK (fat_per_serving IS NULL OR fat_per_serving >= 0),
                    ADD COLUMN IF NOT EXISTS carbs_per_serving numeric
                        CHECK (carbs_per_serving IS NULL OR carbs_per_serving >= 0);

                        -- Cooking sessions table
                        CREATE TABLE IF NOT EXISTS public.cooking_sessions (
                          id         uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
                            recipe_id  uuid         NOT NULL REFERENCES public.recipes(id) ON DELETE CASCADE,
                              messages   jsonb        NOT NULL DEFAULT '[]'::jsonb,
                                summary    text,
                                  cooked_at  timestamptz  NOT NULL DEFAULT now()
                                  );

                                  CREATE INDEX IF NOT EXISTS idx_cooking_sessions_recipe_id
                                    ON public.cooking_sessions(recipe_id);
