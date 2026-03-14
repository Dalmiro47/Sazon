export const ALLOWED_CATEGORIES = [
  'main',
  'starter',
  'dessert',
  'snack',
  'breakfast',
  'side',
  'sauce',
  'drink',
] as const;

export type Category = (typeof ALLOWED_CATEGORIES)[number];

export const CATEGORY_LABELS: Record<Category, string> = {
  main: 'Plato fuerte',
  starter: 'Entrada',
  dessert: 'Postre',
  snack: 'Snack',
  breakfast: 'Desayuno',
  side: 'Guarnición',
  sauce: 'Salsa',
  drink: 'Trago',
};

export const ALLOWED_UNITS = [
  'g',
  'kg',
  'ml',
  'l',
  'cdta',
  'cda',
  'taza',
  'pieza',
  'pizca',
] as const;

export type Unit = (typeof ALLOWED_UNITS)[number];
