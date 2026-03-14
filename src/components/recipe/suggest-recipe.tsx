'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { suggestRecipeAction } from '@/app/actions/suggest-recipe';
import { upsertRecipeAction } from '@/app/actions/recipe';
import type { RecipePayload } from '@/types/recipe';

export function SuggestRecipe() {
  const router = useRouter();
  const [constraint, setConstraint] = useState('');
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [draft, setDraft] = useState<RecipePayload | null>(null);

  async function handleSuggest() {
    setLoading(true);
    setDraft(null);

    const result = await suggestRecipeAction(constraint);

    if (result.ok) {
      setDraft(result.recipe);
    } else {
      toast.error(result.message);
    }

    setLoading(false);
  }

  async function handleSave() {
    if (!draft) return;
    setSaving(true);

    const result = await upsertRecipeAction(draft);

    if (result.ok) {
      toast.success('Recipe saved!');
      router.push(`/recipes/${result.recipe.slug}`);
      router.refresh();
    } else {
      toast.error(result.message);
    }

    setSaving(false);
  }

  function handleDiscard() {
    setDraft(null);
  }

  return (
    <div className="space-y-6">
      <div>
        <Label htmlFor="constraint">What do you have or what are you in the mood for?</Label>
        <div className="mt-2 flex gap-2">
          <Input
            id="constraint"
            value={constraint}
            onChange={(e) => setConstraint(e.target.value)}
            placeholder="e.g., chicken and potatoes, something quick, vegetarian..."
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleSuggest();
              }
            }}
          />
          <Button onClick={handleSuggest} disabled={loading}>
            {loading ? 'Thinking...' : 'Suggest'}
          </Button>
        </div>
      </div>

      {draft && (
        <Card>
          <CardHeader>
            <div className="flex items-start justify-between gap-2">
              <CardTitle>{draft.name}</CardTitle>
              {draft.category && (
                <Badge variant="secondary">{draft.category}</Badge>
              )}
            </div>
            {draft.tags && draft.tags.length > 0 && (
              <div className="flex flex-wrap gap-1">
                {draft.tags.map((tag) => (
                  <Badge key={tag} variant="outline" className="text-xs">
                    {tag}
                  </Badge>
                ))}
              </div>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <p className="text-sm font-medium">
                Servings: {draft.servings ?? 2}
              </p>
            </div>

            <Separator />

            <div>
              <h3 className="mb-2 font-medium">Ingredients</h3>
              <ul className="space-y-1">
                {draft.ingredients?.map((ing, i) => (
                  <li key={i} className="text-sm">
                    {ing.qty !== null && <span className="font-medium">{ing.qty}</span>}
                    {ing.unit && <span className="ml-1">{ing.unit}</span>}
                    <span className="ml-1">{ing.name}</span>
                    {ing.qty === null && (
                      <span className="ml-1 text-muted-foreground">(to taste)</span>
                    )}
                    {ing.note && (
                      <span className="ml-1 text-muted-foreground">— {ing.note}</span>
                    )}
                  </li>
                ))}
              </ul>
            </div>

            <Separator />

            <div>
              <h3 className="mb-2 font-medium">Steps</h3>
              <ol className="space-y-2">
                {draft.steps?.map((step) => (
                  <li key={step.order} className="text-sm">
                    <span className="font-medium">{step.order}. {step.title}</span>
                    <p className="mt-0.5 text-muted-foreground">{step.content}</p>
                    {step.timer && (
                      <p className="text-xs text-muted-foreground">
                        Timer: {step.timer >= 60 ? `${Math.floor(step.timer / 60)}m` : `${step.timer}s`}
                      </p>
                    )}
                  </li>
                ))}
              </ol>
            </div>

            {draft.notes && (
              <>
                <Separator />
                <div>
                  <h3 className="mb-1 font-medium">Notes</h3>
                  <p className="text-sm text-muted-foreground">{draft.notes}</p>
                </div>
              </>
            )}

            <Separator />

            <div className="flex gap-2">
              <Button onClick={handleSave} disabled={saving}>
                {saving ? 'Saving...' : 'Save recipe'}
              </Button>
              <Button variant="outline" onClick={handleDiscard}>
                Discard
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
