import { notFound } from 'next/navigation';
import Link from 'next/link';
import { ArrowLeft } from 'lucide-react';
import { createClient } from '@/lib/supabase/server';
import { Separator } from '@/components/ui/separator';
import { ServingsScaler } from '@/components/recipe/servings-scaler';
import { StepTracker } from '@/components/recipe/step-tracker';
import { DeleteRecipeButton } from '@/components/recipe/delete-recipe-button';
import { MacroDisplay } from '@/components/recipe/macro-display';
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
  const isFit = recipe.tags.includes('fit');
  const isFat = recipe.tags.includes('fat');

  return (
    <div>
      {/* Back link */}
      <Link
        href="/"
        className="mb-4 inline-flex items-center gap-1.5 text-sm text-[#9C8B7A] hover:text-[#2C2416]"
      >
        <ArrowLeft size={16} />
        Recetas
      </Link>

      {/* Header */}
      <div className="mb-4">
        <h1 className="text-2xl font-bold text-[#2C2416]">{recipe.name}</h1>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span className="rounded-full bg-[#5C7A3E] px-3 py-0.5 text-xs font-medium text-white">
            {CATEGORY_LABELS[recipe.category as Category] ?? recipe.category}
          </span>
          {(isFit || isFat) && (
            <span
              className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                isFit
                  ? 'bg-[#F0EAD6] text-[#5C7A3E]'
                  : 'bg-[#F0EAD6] text-[#8B4513]'
              }`}
            >
              {isFit ? '💪 Fit' : '🍔 Fat'}
            </span>
          )}
          {recipe.source && (
            <span className="text-sm text-[#9C8B7A]">· {recipe.source}</span>
          )}
        </div>
      </div>

      {/* Action buttons */}
      <div className="mb-6 flex gap-2">
        <Link
          href={`/recipes/${recipe.slug}/cook`}
          className="rounded-full bg-[#5C7A3E] px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-[#4a6433]"
        >
          Cocinar
        </Link>
        <Link
          href={`/recipes/${recipe.slug}/edit`}
          className="rounded-full border border-[#E8E0D0] px-5 py-2 text-sm font-medium text-[#2C2416] transition-colors hover:bg-[#F5F0EB]"
        >
          Editar
        </Link>
        <DeleteRecipeButton recipeId={recipe.id} recipeName={recipe.name} />
      </div>

      <Separator className="border-[#E8E0D0]" />

      {/* Ingredients */}
      <div className="my-5">
        <h2 className="mb-3 text-lg font-semibold text-[#2C2416]">Ingredientes</h2>
        <ServingsScaler
          baseServings={recipe.servings}
          ingredients={recipe.ingredients}
        />
      </div>

      <Separator className="border-[#E8E0D0]" />

      {/* Steps */}
      <div className="my-5">
        <StepTracker slug={recipe.slug} steps={recipe.steps} />
      </div>

      {recipe.notes && (
        <>
          <Separator className="border-[#E8E0D0]" />
          <div className="my-5">
            <h2 className="mb-2 text-lg font-semibold text-[#2C2416]">Notas</h2>
            <p className="whitespace-pre-wrap text-sm text-[#4A3F35]">
              {recipe.notes}
            </p>
          </div>
        </>
      )}

      {(recipe.calories_per_serving !== null ||
        recipe.protein_per_serving !== null ||
        recipe.fat_per_serving !== null ||
        recipe.carbs_per_serving !== null) && (
        <>
          <Separator className="border-[#E8E0D0]" />
          <div className="my-5">
            <h2 className="mb-3 text-lg font-semibold text-[#2C2416]">Macros por porción</h2>
            <MacroDisplay
              calories_per_serving={recipe.calories_per_serving}
              protein_per_serving={recipe.protein_per_serving}
              fat_per_serving={recipe.fat_per_serving}
              carbs_per_serving={recipe.carbs_per_serving}
            />
          </div>
        </>
      )}
    </div>
  );
}
