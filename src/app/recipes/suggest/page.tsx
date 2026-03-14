import { SuggestRecipe } from '@/components/recipe/suggest-recipe';

export default function SuggestRecipePage() {
  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Suggest a Recipe</h1>
      <p className="mb-4 text-muted-foreground">
        Tell us what you have or what you&apos;re in the mood for, and we&apos;ll suggest a recipe.
      </p>
      <SuggestRecipe />
    </div>
  );
}
