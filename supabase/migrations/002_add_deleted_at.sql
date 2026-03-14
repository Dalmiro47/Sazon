-- Soft-delete: add deleted_at column to recipes
ALTER TABLE public.recipes
  ADD COLUMN IF NOT EXISTS deleted_at timestamptz DEFAULT NULL;

CREATE INDEX IF NOT EXISTS idx_recipes_deleted_at ON public.recipes (deleted_at)
  WHERE deleted_at IS NULL;
