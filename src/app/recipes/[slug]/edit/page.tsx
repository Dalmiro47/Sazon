import { notFound } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { RecipeForm } from '@/components/recipe/recipe-form';
import type { Recipe } from '@/types/recipe';

interface PageProps {
  params: { slug: string };
}

export default async function EditRecipePage({ params }: PageProps) {
  const supabase = createClient();
  const { data } = await supabase
    .from('recipes')
    .select('*')
    .eq('slug', params.slug)
    .is('deleted_at', null)
    .maybeSingle();

  if (!data) notFound();

  const recipe = data as Recipe;

  return (
    <div>
      <h1 className="mb-6 text-2xl font-bold">Editar: {recipe.name}</h1>
      <RecipeForm recipe={recipe} />
    </div>
  );
}
