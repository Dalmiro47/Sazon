import type { RecipePayload, Ingredient, RecipeStep } from '@/types/recipe';
import { ALLOWED_UNITS, ALLOWED_CATEGORIES } from '@/types/constants';
import type { Category } from '@/types/constants';

/** Maps common AI-generated category aliases (Spanish/variants) to allowed enum values */
const CATEGORY_ALIASES: Record<string, Category> = {
  // Spanish — main
  'plato fuerte': 'main',
  'plato principal': 'main',
  'segundo plato': 'main',
  principal: 'main',
  almuerzo: 'main',
  cena: 'main',
  comida: 'main',
  // Spanish — starter
  entrada: 'starter',
  entrante: 'starter',
  'primer plato': 'starter',
  // Spanish — dessert
  postre: 'dessert',
  dulce: 'dessert',
  // Spanish — snack
  merienda: 'snack',
  aperitivo: 'snack',
  tentempie: 'snack',
  picada: 'snack',
  // Spanish — breakfast
  desayuno: 'breakfast',
  // Spanish — side
  'guarnición': 'side',
  guarnicion: 'side',
  'acompañamiento': 'side',
  acompanamiento: 'side',
  'plato acompañante': 'side',
  // Spanish — sauce
  salsa: 'sauce',
  aderezo: 'sauce',
  condimento: 'sauce',
  // Spanish — drink
  bebida: 'drink',
  trago: 'drink',
  'batido': 'drink',
  jugo: 'drink',
  // English variants
  'main course': 'main',
  'main dish': 'main',
  dinner: 'main',
  lunch: 'main',
  appetizer: 'starter',
  'first course': 'starter',
  dessert: 'dessert',
  snack: 'snack',
  breakfast: 'breakfast',
  'side dish': 'side',
  side: 'side',
  garnish: 'side',
  sauce: 'sauce',
  dip: 'sauce',
  condiment: 'sauce',
  drink: 'drink',
  beverage: 'drink',
  smoothie: 'drink',
};

function normalizeCategory(category: string | undefined): Category | undefined {
  if (!category) return undefined;
  const normalized = category.toLowerCase().trim();
  if ((ALLOWED_CATEGORIES as readonly string[]).includes(normalized))
    return normalized as Category;
  return CATEGORY_ALIASES[normalized];
}

/** Maps common AI-generated unit aliases to allowed values */
const UNIT_ALIASES: Record<string, string> = {
  cucharadita: 'cdta',
  cdita: 'cdta',
  cucharada: 'cda',
  cucharadas: 'cda',
  tazas: 'taza',
  unidad: 'pieza',
  unidades: 'pieza',
  und: 'pieza',
  gramo: 'g',
  gramos: 'g',
  kilogramo: 'kg',
  kilogramos: 'kg',
  mililitro: 'ml',
  mililitros: 'ml',
  litros: 'l',
};

function normalizeUnit(unit: string | null | undefined): string | null {
  if (!unit) return null;
  const normalized = unit.toLowerCase().trim();
  if ((ALLOWED_UNITS as readonly string[]).includes(normalized)) return normalized;
  return UNIT_ALIASES[normalized] ?? null;
}

function sanitizeIngredient(ing: Ingredient): Ingredient | null {
  const name = ing.name?.trim();
  if (!name) return null; // Drop ingredients with no name

  const unit = normalizeUnit(ing.unit);
  const qty = typeof ing.qty === 'number' && !isNaN(ing.qty) ? ing.qty : null;

  return {
    qty,
    unit: qty === null ? null : unit, // Invariant: if qty is null, unit must be null
    name,
    ...(ing.note?.trim() ? { note: ing.note.trim() } : {}),
  };
}

function sanitizeStep(step: RecipeStep, order: number): RecipeStep | null {
  const title = step.title?.trim();
  const content = step.content?.trim();
  if (!title && !content) return null; // Drop fully empty steps
  return {
    order,
    title: title || `Paso ${order}`,
    content: content || '',
    ...(step.timer && step.timer > 0 ? { timer: step.timer } : {}),
  };
}

/** Cleans up AI-extracted recipe data: normalizes units, filters empties */
export function sanitizeImportedRecipe(recipe: RecipePayload): RecipePayload {
  const ingredients = (recipe.ingredients ?? [])
    .map(sanitizeIngredient)
    .filter((ing): ing is Ingredient => ing !== null);

  const steps = (recipe.steps ?? [])
    .map((step, i) => sanitizeStep(step, i + 1))
    .filter((step): step is RecipeStep => step !== null)
    .map((step, i) => ({ ...step, order: i + 1 })); // Renormalize order

  // Normalize category — if it can't map to a valid enum, leave undefined so the form shows empty picker
  const category = normalizeCategory(recipe.category);

  return {
    ...recipe,
    category,   // always overrides the raw spread value (undefined = empty picker, valid = prefilled)
    ingredients,
    steps,
  };
}
