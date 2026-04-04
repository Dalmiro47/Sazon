import Link from 'next/link';
import { redirect } from 'next/navigation';
import { X } from 'lucide-react';
import { createAdminClient } from '@/lib/supabase/admin';
import { CookingSessionPanel } from '@/components/recipe/cooking-session';
import type { Recipe } from '@/types/recipe';

interface PageProps {
  params: { slug: string };
  searchParams: { servings?: string };
}

export default async function CookPage({ params, searchParams }: PageProps) {
  const supabase = createAdminClient();
  const { data } = await supabase
    .from('recipes')
    .select('*')
    .eq('slug', params.slug)
    .is('deleted_at', null)
    .maybeSingle();

  if (!data) redirect('/');

  const recipe = data as Recipe;

  const parsed = searchParams.servings ? parseInt(searchParams.servings, 10) : NaN;
  const cookServings =
    !isNaN(parsed) && parsed >= 1 && parsed <= 100 ? parsed : recipe.servings;

  return (
    <div>
      <div className="mb-4 flex items-center justify-between">
        <h1 className="text-2xl font-bold text-[#2C2416]">{recipe.name}</h1>
        <Link
          href={`/recipes/${recipe.slug}`}
          className="rounded-full p-1.5 text-[#9C8B7A] opacity-70 transition-opacity hover:opacity-100"
        >
          <X size={24} />
          <span className="sr-only">Cerrar</span>
        </Link>
      </div>
      <CookingSessionPanel recipe={recipe} cookServings={cookServings} />
    </div>
  );
}
