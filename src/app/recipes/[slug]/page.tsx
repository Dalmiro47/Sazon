import { notFound } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { ServingsScaler } from '@/components/recipe/servings-scaler';
import { StepTracker } from '@/components/recipe/step-tracker';
import { DeleteRecipeButton } from '@/components/recipe/delete-recipe-button';
import { CATEGORY_LABELS } from '@/types/constants';
import type { Recipe } from '@/types/recipe';
import type { Category } from '@/types/constants';

interface PageProps {
  params: { slug: string };
}

export default async function RecipeDetailPage({ params }: PageProps) {
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
      <div className="mb-4 flex items-start justify-between gap-4">
        <div>
          <h1 className="text-2xl font-bold">{recipe.name}</h1>
          <div className="mt-1 flex items-center gap-2">
            <Badge variant="secondary">{CATEGORY_LABELS[recipe.category as Category] ?? recipe.category}</Badge>
            {recipe.source && (
              <span className="text-sm text-muted-foreground">
                Fuente: {recipe.source}
              </span>
            )}
          </div>
        </div>
        <div className="flex shrink-0 gap-2">
          <Link
            href={`/recipes/${recipe.slug}/edit`}
            className="rounded-md border px-3 py-1.5 text-sm hover:bg-accent"
          >
            Editar
          </Link>
          <DeleteRecipeButton recipeId={recipe.id} recipeName={recipe.name} />
        </div>
      </div>

      {recipe.tags.length > 0 && (
        <div className="mb-4 flex flex-wrap gap-1">
          {recipe.tags.map((tag) => (
            <Badge key={tag} variant="outline">
              {tag}
            </Badge>
          ))}
        </div>
      )}

      {recipe.image_url && (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={recipe.image_url}
          alt={recipe.name}
          className="mb-4 w-full rounded-lg object-cover"
          style={{ maxHeight: 400 }}
        />
      )}

      <Separator className="my-4" />

      <h2 className="mb-3 text-lg font-semibold">Ingredientes</h2>
      <ServingsScaler
        baseServings={recipe.servings}
        ingredients={recipe.ingredients}
      />

      <Separator className="my-6" />

      <StepTracker slug={recipe.slug} steps={recipe.steps} />

      {recipe.notes && (
        <>
          <Separator className="my-6" />
          <h2 className="mb-2 text-lg font-semibold">Notas</h2>
          <p className="whitespace-pre-wrap text-sm text-muted-foreground">
            {recipe.notes}
          </p>
        </>
      )}
    </div>
  );
}
