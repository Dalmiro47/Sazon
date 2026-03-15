import { redirect } from 'next/navigation';
import { createClient } from '@/lib/supabase/server';
import { CookingSessionPanel } from '@/components/recipe/cooking-session';
import type { Recipe } from '@/types/recipe';

interface PageProps {
  params: { slug: string };
}

export default async function CookPage({ params }: PageProps) {
  const supabase = createClient();
  const { data } = await supabase
    .from('recipes')
    .select('*')
    .eq('slug', params.slug)
    .is('deleted_at', null)
    .maybeSingle();

  if (!data) redirect('/');

  const recipe = data as Recipe;

  return (
    <div>
      <CookingSessionPanel recipe={recipe} />
    </div>
  );
}
