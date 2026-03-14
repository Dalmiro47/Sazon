import { Recipe } from './recipe';

export interface ActionError {
  ok: false;
  code: 'VALIDATION_ERROR' | 'NOT_FOUND' | 'SLUG_CONFLICT' | 'DB_ERROR';
  message: string;
  fields?: Record<string, string>;
}

export interface ActionSuccess {
  ok: true;
  recipe: Recipe;
  operation: 'created' | 'updated';
}

export type ActionResult = ActionSuccess | ActionError;
