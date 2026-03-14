import { SuggestRecipe } from '@/components/recipe/suggest-recipe';

export default function SuggestRecipePage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Sugerir una Receta</h1>
      <p className="mb-4 text-muted-foreground">
        Cuéntanos qué tienes o qué se te antoja, y te sugeriremos una receta.
      </p>
      <SuggestRecipe />
    </div>
  );
}
