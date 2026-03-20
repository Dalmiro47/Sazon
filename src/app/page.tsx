import { createAdminClient } from '@/lib/supabase/admin';
import { RecipeGrid } from '@/components/recipe/recipe-grid';
import type { Recipe } from '@/types/recipe';

export default async function HomePage() {
  const supabase = createAdminClient();
  const { data: recipes } = await supabase
    .from('recipes')
    .select('*')
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });

  const recipeList = (recipes as Recipe[] | null) ?? [];

  return (
    <div>
      <h1 className="mb-4 text-2xl font-bold text-[#2C2416]">Recetas</h1>
      <RecipeGrid recipes={recipeList} />
    </div>
  );
}
