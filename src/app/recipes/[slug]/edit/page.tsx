import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/admin';
import { RecipeForm } from '@/components/recipe/recipe-form';
import type { Recipe } from '@/types/recipe';

interface PageProps {
  params: { slug: string };
}

export default async function EditRecipePage({ params }: PageProps) {
  const supabase = createAdminClient();
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
      <Link
        href={`/recipes/${recipe.slug}`}
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-[#9C8B7A] hover:text-[#2C2416]"
      >
        <ArrowLeft size={16} />
        Volver
      </Link>
      <h1 className="mb-6 text-2xl font-bold text-[#2C2416]">Editar: {recipe.name}</h1>
      <RecipeForm recipe={recipe} />
    </div>
  );
}
