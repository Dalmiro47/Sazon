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

export const ALLOWED_UNITS = [
  'g',
  'kg',
  'ml',
  'l',
  'tsp',
  'tbsp',
  'cup',
  'piece',
  'pinch',
  'fl_oz',
  'oz',
  'lb',
] as const;

export type Unit = (typeof ALLOWED_UNITS)[number];
