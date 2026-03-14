-- Sazón: recipes table
-- Shared Supabase instance (also used by Open Brain — separate table)

CREATE TABLE IF NOT EXISTS public.recipes (
  id           uuid         PRIMARY KEY DEFAULT gen_random_uuid(),
  name         text         NOT NULL CHECK (char_length(trim(name)) >= 2),
  slug         text         NOT NULL UNIQUE
                            CHECK (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  category     text         NOT NULL
                            CHECK (category IN (
                              'main','starter','dessert',
                              'snack','breakfast','side','sauce','drink'
                            )),
  servings     integer      NOT NULL DEFAULT 2
                            CHECK (servings >= 1 AND servings <= 100),
  source       text         CHECK (char_length(source) <= 200),
  ingredients  jsonb        NOT NULL DEFAULT '[]'::jsonb,
  steps        jsonb        NOT NULL DEFAULT '[]'::jsonb,
  notes        text,
  tags         text[]       NOT NULL DEFAULT '{}',
  image_url    text         CHECK (image_url IS NULL OR image_url ~ '^https?://'),
  created_at   timestamptz  NOT NULL DEFAULT now(),
  updated_at   timestamptz  NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_recipes_slug ON public.recipes (slug);
CREATE INDEX IF NOT EXISTS idx_recipes_category ON public.recipes (category);

-- Trigger: auto-update updated_at on row modification
CREATE OR REPLACE FUNCTION public.set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER trg_recipes_updated_at
  BEFORE UPDATE ON public.recipes
  FOR EACH ROW
  EXECUTE FUNCTION public.set_updated_at();
