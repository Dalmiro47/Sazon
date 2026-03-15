'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
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

const inputCls =
  'w-full rounded-xl border border-[#E8E0D0] bg-[#F5F0EB] px-3 py-2 text-sm text-[#2C2416] outline-none placeholder:text-[#9C8B7A] focus:ring-2 focus:ring-[#5C7A3E]/40';

export function RecipeForm({ recipe }: RecipeFormProps) {
  const router = useRouter();
  const [submitting, setSubmitting] = useState(false);

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
    recipe?.steps?.length ? recipe.steps : [{ ...EMPTY_STEP, order: 1 }]
  );
  const [tagInput, setTagInput] = useState('');
  const [tags, setTags] = useState<string[]>(recipe?.tags ?? []);
  const [caloriesPerServing, setCaloriesPerServing] = useState<string>(
    recipe?.calories_per_serving?.toString() ?? ''
  );
  const [proteinPerServing, setProteinPerServing] = useState<string>(
    recipe?.protein_per_serving?.toString() ?? ''
  );
  const [fatPerServing, setFatPerServing] = useState<string>(
    recipe?.fat_per_serving?.toString() ?? ''
  );
  const [carbsPerServing, setCarbsPerServing] = useState<string>(
    recipe?.carbs_per_serving?.toString() ?? ''
  );
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
      calories_per_serving: caloriesPerServing ? parseFloat(caloriesPerServing) : null,
      protein_per_serving: proteinPerServing ? parseFloat(proteinPerServing) : null,
      fat_per_serving: fatPerServing ? parseFloat(fatPerServing) : null,
      carbs_per_serving: carbsPerServing ? parseFloat(carbsPerServing) : null,
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
    <form onSubmit={handleSubmit} className="space-y-5">
      {/* Name */}
      <div>
        <label className="mb-1 block text-sm font-semibold text-[#2C2416]">Nombre</label>
        <input
          value={name}
          onChange={(e) => setName(e.target.value)}
          placeholder="Nombre de la receta"
          required
          className={inputCls}
        />
        {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name}</p>}
      </div>

      {/* Category */}
      <div>
        <label className="mb-1 block text-sm font-semibold text-[#2C2416]">Categoría</label>
        <Select value={category} onValueChange={(v) => setCategory(v ?? '')}>
          <SelectTrigger className="rounded-xl border-[#E8E0D0] !bg-[#F5F0EB] text-sm text-[#2C2416] focus:ring-[#5C7A3E]/40">
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
        {errors.category && <p className="mt-1 text-xs text-red-600">{errors.category}</p>}
      </div>

      {/* Servings */}
      <div>
        <label className="mb-1 block text-sm font-semibold text-[#2C2416]">Porciones</label>
        <input
          type="number"
          min={1}
          max={100}
          value={servings}
          onChange={(e) => setServings(parseInt(e.target.value) || 2)}
          className={`${inputCls} w-24`}
        />
        {errors.servings && <p className="mt-1 text-xs text-red-600">{errors.servings}</p>}
      </div>

      <Separator className="border-[#E8E0D0]" />

      {/* Ingredients */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold text-[#2C2416]">Ingredientes</span>
          <button
            type="button"
            onClick={addIngredient}
            className="rounded-full border border-[#E8E0D0] bg-[#F5F0EB] px-3 py-1 text-xs font-semibold text-[#5C7A3E] transition-colors hover:bg-[#E8E0D0]"
          >
            + Agregar
          </button>
        </div>
        <div className="space-y-2">
          {ingredients.map((ing, i) => (
            <div key={i} className="flex gap-1.5">
              <input
                placeholder="Cant."
                type="number"
                step="any"
                className={`${inputCls} w-16`}
                value={ing.qty ?? ''}
                onChange={(e) =>
                  updateIngredient(i, 'qty', e.target.value ? parseFloat(e.target.value) : null)
                }
              />
              <Select
                value={ing.unit ?? 'none'}
                onValueChange={(v) => updateIngredient(i, 'unit', !v || v === 'none' ? null : v)}
              >
                <SelectTrigger className="w-20 rounded-xl border-[#E8E0D0] !bg-[#F5F0EB] text-sm text-[#2C2416]">
                  <SelectValue placeholder="—" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="none">—</SelectItem>
                  {ALLOWED_UNITS.map((u) => (
                    <SelectItem key={u} value={u}>{u}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <input
                placeholder="Nombre"
                className={`${inputCls} flex-1`}
                value={ing.name}
                onChange={(e) => updateIngredient(i, 'name', e.target.value)}
              />
              <input
                placeholder="Nota"
                className={`${inputCls} w-24`}
                value={ing.note ?? ''}
                onChange={(e) => updateIngredient(i, 'note', e.target.value)}
              />
              {ingredients.length > 1 && (
                <button
                  type="button"
                  onClick={() => removeIngredient(i)}
                  className="px-1 text-sm text-[#9C8B7A] hover:text-red-500"
                >
                  ×
                </button>
              )}
            </div>
          ))}
        </div>
        {Object.entries(errors)
          .filter(([k]) => k.startsWith('ingredients'))
          .map(([k, v]) => (
            <p key={k} className="mt-1 text-xs text-red-600">{v}</p>
          ))}
      </div>

      <Separator className="border-[#E8E0D0]" />

      {/* Steps */}
      <div>
        <div className="mb-2 flex items-center justify-between">
          <span className="text-sm font-semibold text-[#2C2416]">Pasos</span>
          <button
            type="button"
            onClick={addStep}
            className="rounded-full border border-[#E8E0D0] bg-[#F5F0EB] px-3 py-1 text-xs font-semibold text-[#5C7A3E] transition-colors hover:bg-[#E8E0D0]"
          >
            + Agregar
          </button>
        </div>
        <div className="space-y-3">
          {steps.map((step, i) => (
            <div key={i} className="rounded-xl border border-[#E8E0D0] bg-[#FAF6EF] p-3">
              <div className="mb-2 flex items-center justify-between">
                <span className="text-xs font-semibold text-[#9C8B7A]">Paso {i + 1}</span>
                {steps.length > 1 && (
                  <button
                    type="button"
                    onClick={() => removeStep(i)}
                    className="text-xs text-[#9C8B7A] hover:text-red-500"
                  >
                    Quitar
                  </button>
                )}
              </div>
              <input
                placeholder="Título del paso"
                className={`${inputCls} mb-2`}
                value={step.title}
                onChange={(e) => updateStep(i, 'title', e.target.value)}
              />
              <textarea
                placeholder="Instrucciones del paso"
                className={`${inputCls} mb-2 resize-y`}
                rows={3}
                value={step.content}
                onChange={(e) => updateStep(i, 'content', e.target.value)}
              />
              <input
                placeholder="Temporizador (segundos, opcional)"
                type="number"
                min={1}
                max={86400}
                className={`${inputCls} w-48`}
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
            <p key={k} className="mt-1 text-xs text-red-600">{v}</p>
          ))}
      </div>

      <Separator className="border-[#E8E0D0]" />

      {/* Tags */}
      <div>
        <label className="mb-1 block text-sm font-semibold text-[#2C2416]">Etiquetas</label>
        <div className="flex gap-2">
          <input
            placeholder="Agregar etiqueta"
            value={tagInput}
            onChange={(e) => setTagInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                addTag();
              }
            }}
            className={`${inputCls} flex-1`}
          />
          <button
            type="button"
            onClick={addTag}
            className="rounded-full border border-[#E8E0D0] bg-[#F5F0EB] px-4 py-2 text-sm font-semibold text-[#5C7A3E] transition-colors hover:bg-[#E8E0D0]"
          >
            Agregar
          </button>
        </div>
        {tags.length > 0 && (
          <div className="mt-2 flex flex-wrap gap-1">
            {tags.map((tag) => (
              <button
                key={tag}
                type="button"
                onClick={() => removeTag(tag)}
                className="rounded-full bg-[#F0EAD6] px-2.5 py-0.5 text-xs font-medium text-[#5C7A3E] hover:bg-red-100 hover:text-red-600"
              >
                {tag} ×
              </button>
            ))}
          </div>
        )}
      </div>

      {/* Source */}
      <div>
        <label className="mb-1 block text-sm font-semibold text-[#2C2416]">Fuente</label>
        <input
          value={source}
          onChange={(e) => setSource(e.target.value)}
          placeholder="¿De dónde viene esta receta?"
          className={inputCls}
        />
      </div>

      {/* Image URL */}
      <div>
        <label className="mb-1 block text-sm font-semibold text-[#2C2416]">URL de imagen</label>
        <input
          value={imageUrl}
          onChange={(e) => setImageUrl(e.target.value)}
          placeholder="https://..."
          className={inputCls}
        />
      </div>

      {/* Notes */}
      <div>
        <label className="mb-1 block text-sm font-semibold text-[#2C2416]">Notas</label>
        <textarea
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
          placeholder="Consejos, variaciones, etc."
          rows={4}
          className={`${inputCls} resize-y`}
        />
      </div>

      <Separator className="border-[#E8E0D0]" />

      {/* Macros */}
      <div>
        <span className="mb-2 block text-sm font-semibold text-[#2C2416]">Macros por porción</span>
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {[
            { label: 'Calorías', value: caloriesPerServing, set: setCaloriesPerServing },
            { label: 'Proteína (g)', value: proteinPerServing, set: setProteinPerServing },
            { label: 'Grasa (g)', value: fatPerServing, set: setFatPerServing },
            { label: 'Carbos (g)', value: carbsPerServing, set: setCarbsPerServing },
          ].map(({ label, value, set }) => (
            <div key={label}>
              <label className="mb-1 block text-xs text-[#9C8B7A]">{label}</label>
              <input
                type="number"
                step="any"
                value={value}
                onChange={(e) => set(e.target.value)}
                placeholder="0"
                className={inputCls}
              />
            </div>
          ))}
        </div>
        {Object.entries(errors)
          .filter(([k]) => k.includes('_per_serving'))
          .map(([k, v]) => (
            <p key={k} className="mt-1 text-xs text-red-600">{v}</p>
          ))}
      </div>

      {/* Submit */}
      <button
        type="submit"
        disabled={submitting}
        className="w-full rounded-full bg-[#5C7A3E] py-3 text-sm font-bold text-white transition-colors hover:bg-[#4a6433] disabled:opacity-60"
      >
        {submitting ? 'Guardando...' : recipe ? 'Actualizar receta' : 'Crear receta'}
      </button>
    </form>
  );
}
