'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { upsertRecipeAction } from '@/app/actions/recipe';
import { ALLOWED_CATEGORIES, ALLOWED_UNITS, CATEGORY_LABELS } from '@/types/constants';
import type { Category } from '@/types/constants';
import type { Recipe, Ingredient, RecipeStep, RecipePayload } from '@/types/recipe';

interface RecipeFormProps {
  recipe?: Recipe;
}

const EMPTY_INGREDIENT: Ingredient = { qty: null, unit: null, name: '', note: '' };
const EMPTY_STEP = { title: '', content: '' };

export function RecipeForm({ recipe }: RecipeFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState(recipe?.name ?? '');
  const [category, setCategory] = useState(recipe?.category ?? '');
  const [servings, setServings] = useState(recipe?.servings ?? 2);
  const [source, setSource] = useState(recipe?.source ?? '');
  const [notes, setNotes] = useState(recipe?.notes ?? '');
  const [imageUrl, setImageUrl] = useState(recipe?.image_url ?? '');
  const [ingredients, setIngredients] = useState<Ingredient[]>(
    recipe?.ingredients?.length ? recipe.ingredients : [{ ...EMPTY_INGREDIENT }]
  );
  const [steps, setSteps] = useState<RecipeStep[]>(
    recipe?.steps?.length
      ? recipe.steps
      : [{ ...EMPTY_STEP, order: 1 }]
  );
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(recipe?.tags ?? []);
  const [errors, setErrors] = useState<Record<string, string>>({});

  function addTag() {
    const tag = tagInput.trim().toLowerCase();
    if (tag && !tags.includes(tag) && tags.length < 20) {
      setTags([...tags, tag]);
      setTagInput('');
    }
  }

  function removeTag(tag: string) {
    setTags(tags.filter((t) => t !== tag));
  }

  function updateIngredient(index: number, field: keyof Ingredient, value: string | number | null) {
    setIngredients((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  function addIngredient() {
    setIngredients([...ingredients, { ...EMPTY_INGREDIENT }]);
  }

  function removeIngredient(index: number) {
    setIngredients(ingredients.filter((_, i) => i !== index));
  }

  function updateStep(index: number, field: keyof RecipeStep, value: string | number) {
    setSteps((prev) => {
      const updated = [...prev];
      updated[index] = { ...updated[index], [field]: value };
      return updated;
    });
  }

  function addStep() {
    setSteps([...steps, { ...EMPTY_STEP, order: steps.length + 1 }]);
  }

  function removeStep(index: number) {
    setSteps(steps.filter((_, i) => i !== index));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSubmitting(true);
    setErrors({});

    const payload: RecipePayload = {
      ...(recipe?.id ? { id: recipe.id } : {}),
      name,
      category,
      servings,
      source: source || null,
      notes: notes || null,
      image_url: imageUrl || null,
      tags,
      ingredients: ingredients.filter((ing) => ing.name.trim()),
      steps: steps
        .filter((s) => s.title.trim() || s.content.trim())
        .map((s, i) => ({
          order: i + 1,
          title: s.title,
          content: s.content,
          ...(s.timer ? { timer: s.timer } : {}),
        })),
    };

    const result = await upsertRecipeAction(payload);

    if (result.ok) {
      toast.success(result.operation === 'created' ? '¡Receta creada!' : '¡Receta actualizada!');
      router.push(`/recipes/${result.recipe.slug}`);
      router.refresh();
    } else {
      setErrors(result.fields ?? {});
      toast.error(result.message);
    }

    setSubmitting(false);
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      {/* Name */}
      <div>
        <Label htmlFor="name">Nombre</Label>
        <Input
          id="name"
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre de la receta"
          required
        />
        {errors.name && <p className="mt-1 text-sm text-destructive">{errors.name}</p>}
      </div>

      {/* Category */}
      <div>
        <Label>Categoría</Label>
        <Select value={category} onValueChange={(v) => setCategory(v ?? '')}>
          <SelectTrigger>
            <SelectValue placeholder="Seleccionar categoría" />
          </SelectTrigger>
          <SelectContent>
            {ALLOWED_CATEGORIES.map((cat) => (
              <SelectItem key={cat} value={cat}>
                {CATEGORY_LABELS[cat as Category]}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {errors.category && <p className="mt-1 text-sm text-destructive">{errors.category}</p>}
      </div>

      {/* Servings */}
      <div>
        <Label htmlFor="servings">Porciones</Label>
        <Input
          id="servings"
          type="number"
          min={1}
          max={100}
          value={servings}
          onChange={(e) => setServings(parseInt(e.target.value) || 2)}
        />
        {errors.servings && <p className="mt-1 text-sm text-destructive">{errors.servings}</p>}
      </div>

      <Separator />

      {/* Ingredients */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <Label>Ingredientes</Label>
          <Button type="button" variant="outline" size="sm" onClick={addIngredient}>
            + Agregar
          </Button>
        </div>
        <div className="space-y-2">
          {ingredients.map((ing, i) => (
            <div key={i} className="flex gap-2">
              <Input
                placeholder="Cant."
                type="number"
                step="any"
                className="w-20"
                value={ing.qty ?? ''}
                onChange={(e) =>
                  updateIngredient(i, 'qty', e.target.value ? parseFloat(e.target.value) : null)
                }
              />
              <Select
                value={ing.unit ?? 'none'}
                onValueChange={(v) => updateIngredient(i, 'unit', !v || v === 'none' ? null : v)}
              >
                <SelectTrigger className="w-24">
                  <SelectValue placeholder="Unidad" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {ALLOWED_UNITS.map((u) => (
                    <SelectItem key={u} value={u}>
                      {u}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Input
                placeholder="Nombre del ingrediente"
                className="flex-1"
                value={ing.name}
                onChange={(e) => updateIngredient(i, 'name', e.target.value)}
              />
              <Input
                placeholder="Nota"
                className="w-32"
                value={ing.note ?? ''}
                onChange={(e) => updateIngredient(i, 'note', e.target.value)}
              />
              {ingredients.length > 1 && (
                <Button
                  type="button"
                  variant="ghost"
                  size="sm"
                  onClick={() => removeIngredient(i)}
                >
                  x
                </Button>
              )}
            </div>
          ))}
        </div>
        {Object.entries(errors)
          .filter(([k]) => k.startsWith('ingredients'))
          .map(([k, v]) => (
            <p key={k} className="mt-1 text-sm text-destructive">
              {k}: {v}
            </p>
          ))}
      </div>

      <Separator />

      {/* Steps */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <Label>Pasos</Label>
          <Button type="button" variant="outline" size="sm" onClick={addStep}>
            + Agregar
          </Button>
        </div>
        <div className="space-y-3">
          {steps.map((step, i) => (
            <div key={i} className="rounded-lg border p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-sm font-medium text-muted-foreground">
                  Paso {i + 1}
                </span>
                {steps.length > 1 && (
                  <Button
                    type="button"
                    variant="ghost"
                    size="sm"
                    onClick={() => removeStep(i)}
                  >
                    Quitar
                  </Button>
                )}
              </div>
              <Input
                placeholder="Título del paso"
                className="mb-2"
                value={step.title}
                onChange={(e) => updateStep(i, 'title', e.target.value)}
              />
              <Textarea
                placeholder="Instrucciones del paso"
                className="mb-2"
                value={step.content}
                onChange={(e) => updateStep(i, 'content', e.target.value)}
              />
              <Input
                placeholder="Temporizador (segundos, opcional)"
                type="number"
                min={1}
                max={86400}
                className="w-48"
                value={step.timer ?? ''}
                onChange={(e) =>
                  updateStep(i, 'timer', e.target.value ? parseInt(e.target.value) : 0)
                }
              />
            </div>
          ))}
        </div>
        {Object.entries(errors)
          .filter(([k]) => k.startsWith('steps'))
          .map(([k, v]) => (
            <p key={k} className="mt-1 text-sm text-destructive">
              {k}: {v}
            </p>
          ))}
      </div>

      <Separator />

      {/* Tags */}
      <div>
        <Label>Etiquetas</Label>
        <div className="flex gap-2">
          <Input
            placeholder="Agregar etiqueta"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addTag();
              }
            }}
          />
          <Button type="button" variant="outline" onClick={addTag}>
            Agregar
          </Button>
        </div>
        {tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {tags.map((tag) => (
              <Badge key={tag} variant="secondary" className="cursor-pointer" onClick={() => removeTag(tag)}>
                {tag} x
              </Badge>
            ))}
          </div>
        )}
      </div>

      {/* Source */}
      <div>
        <Label htmlFor="source">Fuente</Label>
        <Input
          id="source"
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="¿De dónde viene esta receta?"
        />
      </div>

      {/* Image URL */}
      <div>
        <Label htmlFor="image_url">URL de imagen</Label>
        <Input
          id="image_url"
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://..."
        />
      </div>

      {/* Notes */}
      <div>
        <Label htmlFor="notes">Notas</Label>
        <Textarea
          id="notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Consejos, variaciones, etc."
          rows={4}
        />
      </div>

      {/* Submit */}
      <Button type="submit" disabled={submitting} className="w-full">
        {submitting ? 'Guardando...' : recipe ? 'Actualizar receta' : 'Crear receta'}
      </Button>
    </form>
  );
}
