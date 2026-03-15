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
  calories_per_serving: number | null;
  protein_per_serving: number | null;
  fat_per_serving: number | null;
  carbs_per_serving: number | null;
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
  calories_per_serving?: number | null;
  protein_per_serving?: number | null;
  fat_per_serving?: number | null;
  carbs_per_serving?: number | null;
}

export interface SessionMessage {
  role: 'user' | 'assistant';
  content: string;
}

export interface CookingSession {
  id: string;
  recipe_id: string;
  messages: SessionMessage[];
  summary: string | null;
  cooked_at: string;
}

export interface SessionChatResult {
  ok: true;
  reply: string;
  sessionId: string;
}

export interface SessionEndResult {
  ok: true;
  summary: string;
  improved_recipe: RecipePayload;
}
