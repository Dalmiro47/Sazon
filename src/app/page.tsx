import { fetchRecipesAction } from '@/app/actions/recipe';
import { RecipeGrid } from '@/components/recipe/recipe-grid';

export default async function HomePage() {
  const { recipes, hasMore } = await fetchRecipesAction();

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-[#2C2416]">Recetas</h1>
      <RecipeGrid initialRecipes={recipes} initialHasMore={hasMore} />
    </div>
  );
}
