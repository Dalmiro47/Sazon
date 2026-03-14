import { Category } from './constants';

export interface Ingredient {
  qty: number | null;
  unit: string | null;
  name: string;
  note?: string;
}

export interface RecipeStep {
  order: number;
  title: string;
  content: string;
  timer?: number;
}

export interface Recipe {
  id: string;
  name: string;
  slug: string;
  category: Category;
  servings: number;
  source: string | null;
  ingredients: Ingredient[];
  steps: RecipeStep[];
  notes: string | null;
  tags: string[];
  image_url: string | null;
  created_at: string;
  updated_at: string;
  deleted_at: string | null;
}

/** Payload for create/update — fields are optional for partial updates */
export interface RecipePayload {
  id?: string;
  name?: string;
  slug?: string;
  category?: string;
  servings?: number;
  source?: string | null;
  ingredients?: Ingredient[];
  steps?: RecipeStep[];
  notes?: string | null;
  tags?: string[];
  image_url?: string | null;
}
