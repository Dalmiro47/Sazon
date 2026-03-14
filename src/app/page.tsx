import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { CATEGORY_LABELS } from '@/types/constants';
import type { Recipe } from '@/types/recipe';
import type { Category } from '@/types/constants';

export default async function HomePage() {
  const supabase = createClient();
  const { data: recipes } = await supabase
    .from('recipes')
    .select('*')
    .is('deleted_at', null)
    .order('updated_at', { ascending: false });

  const recipeList = (recipes as Recipe[] | null) ?? [];

  return (
    <div>
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-bold">Recetas</h1>
        <Link
          href="/recipes/new"
          className="rounded-md bg-primary px-4 py-2 text-sm text-primary-foreground hover:bg-primary/90"
        >
          Agregar receta
        </Link>
      </div>

      {recipeList.length === 0 ? (
        <p className="text-muted-foreground">
          Aún no hay recetas. ¡Agrega la primera!
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {recipeList.map((recipe) => (
            <Link key={recipe.id} href={`/recipes/${recipe.slug}`}>
              <Card className="transition-colors hover:bg-accent">
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="text-lg">{recipe.name}</CardTitle>
                    <Badge variant="secondary">{CATEGORY_LABELS[recipe.category as Category] ?? recipe.category}</Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  {recipe.tags.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {recipe.tags.map((tag) => (
                        <Badge key={tag} variant="outline" className="text-xs">
                          {tag}
                        </Badge>
                      ))}
                    </div>
                  )}
                  <p className="mt-2 text-xs text-muted-foreground">
                    {recipe.ingredients.length} ingredientes · {recipe.steps.length} pasos · {recipe.servings} porciones
                  </p>
                </CardContent>
              </Card>
            </Link>
          ))}
        </div>
      )}
    </div>
  );
}
