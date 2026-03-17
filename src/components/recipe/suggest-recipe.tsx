'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';
import { suggestIdeasAction } from '@/app/actions/suggest-ideas';
import { suggestRecipeAction } from '@/app/actions/suggest-recipe';
import { refineRecipeAction } from '@/app/actions/refine-recipe';
import { upsertRecipeAction } from '@/app/actions/recipe';
import { ALLOWED_CATEGORIES, CATEGORY_LABELS } from '@/types/constants';
import type { Category } from '@/types/constants';
import type { RecipePayload } from '@/types/recipe';
import type { RecipeIdea } from '@/app/actions/suggest-ideas';

type FitFat = 'fit' | 'fat';
type Step = 'idle' | 'ideas' | 'recipe';

const chipBase =
  'rounded-full border px-3 py-1 text-xs font-semibold transition-colors cursor-pointer select-none';
const chipActive = 'border-[#5C7A3E] bg-[#5C7A3E] text-white';
const chipInactive = 'border-[#E8E0D0] bg-[#F5F0EB] text-[#4A3F35] hover:bg-[#E8E0D0]';

export function SuggestRecipe() {
  const router = useRouter();

  // Filters
  const [constraint, setConstraint] = useState('');
  const [fitFat, setFitFat] = useState<FitFat | null>(null);
  const [category, setCategory] = useState<string | null>(null);

  // Step state
  const [step, setStep] = useState<Step>('idle');
  const [ideas, setIdeas] = useState<RecipeIdea[]>([]);
  const [draft, setDraft] = useState<RecipePayload | null>(null);

  // Loading
  const [loadingIdeas, setLoadingIdeas] = useState(false);
  const [loadingRecipe, setLoadingRecipe] = useState(false);
  const [saving, setSaving] = useState(false);

  // Refinement
  const [refinement, setRefinement] = useState('');
  const [refining, setRefining] = useState(false);

  async function handleGetIdeas() {
    setLoadingIdeas(true);
    setIdeas([]);

    const result = await suggestIdeasAction({
      constraint,
      fitFat: fitFat ?? undefined,
      category: category ?? undefined,
    });

    if (result.ok) {
      setIdeas(result.ideas);
      setStep('ideas');
    } else {
      toast.error(result.message);
    }

    setLoadingIdeas(false);
  }

  async function handlePickIdea(idea: RecipeIdea) {
    setLoadingRecipe(true);
    setDraft(null);

    const result = await suggestRecipeAction({
      constraint: `${idea.name} — ${idea.description}`,
      fitFat: (idea.tag as FitFat) ?? fitFat ?? undefined,
      category: idea.category ?? category ?? undefined,
    });

    if (result.ok) {
      setDraft(result.recipe);
      setStep('recipe');
    } else {
      toast.error(result.message);
    }

    setLoadingRecipe(false);
  }

  async function handleRefine() {
    if (!draft || !refinement.trim()) return;
    setRefining(true);

    const result = await refineRecipeAction(draft, refinement);

    if (result.ok) {
      setDraft(result.recipe);
      setRefinement('');
    } else {
      toast.error(result.message);
    }

    setRefining(false);
  }

  async function handleSave() {
    if (!draft) return;
    setSaving(true);

    const result = await upsertRecipeAction(draft);

    if (result.ok) {
      toast.success('¡Receta guardada!');
      router.push(`/recipes/${result.recipe.slug}`);
      router.refresh();
    } else {
      toast.error(result.message);
    }

    setSaving(false);
  }

  function handleReset() {
    setStep('idle');
    setIdeas([]);
    setDraft(null);
    setRefinement('');
  }

  return (
    <div className="space-y-5">
      {/* Filters — always visible */}
      <div className="space-y-3">
        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[#9C8B7A]">
            Tipo de comida
          </p>
          <div className="flex flex-wrap gap-2">
            {ALLOWED_CATEGORIES.map((cat) => (
              <button
                key={cat}
                type="button"
                onClick={() => setCategory((prev) => (prev === cat ? null : cat))}
                className={`${chipBase} ${category === cat ? chipActive : chipInactive}`}
              >
                {CATEGORY_LABELS[cat as Category]}
              </button>
            ))}
          </div>
        </div>

        <div>
          <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[#9C8B7A]">
            Perfil
          </p>
          <div className="flex flex-wrap gap-2">
            {(['fit', 'fat'] as FitFat[]).map((opt) => (
              <button
                key={opt}
                type="button"
                onClick={() => setFitFat((prev) => (prev === opt ? null : opt))}
                className={`${chipBase} ${fitFat === opt ? chipActive : chipInactive}`}
              >
                {opt === 'fit' ? '💪 Fit' : '🍔 Fat'}
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Free text + submit — only in idle */}
      {step === 'idle' && (
        <div>
          <label className="mb-1 block text-sm font-semibold text-[#2C2416]">
            ¿Qué tienes o qué se te antoja?
          </label>
          <div className="flex gap-2">
            <input
              value={constraint}
              onChange={(e) => setConstraint(e.target.value)}
              placeholder="ej. pollo con papas, algo rápido, vegetariano..."
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  e.preventDefault();
                  handleGetIdeas();
                }
              }}
              className="flex-1 rounded-xl border border-[#E8E0D0] bg-[#F5F0EB] px-3 py-2 text-sm text-[#2C2416] outline-none placeholder:text-[#9C8B7A] focus:ring-2 focus:ring-[#5C7A3E]/40"
            />
            <button
              onClick={handleGetIdeas}
              disabled={loadingIdeas}
              className="rounded-full bg-[#5C7A3E] px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-[#4a6433] disabled:opacity-60"
            >
              {loadingIdeas ? 'Pensando...' : 'Sugerir'}
            </button>
          </div>
        </div>
      )}

      {/* Ideas step */}
      {step === 'ideas' && (
        <div className="space-y-3">
          <div className="flex items-center justify-between">
            <p className="text-sm font-semibold text-[#2C2416]">
              {loadingRecipe ? 'Generando receta...' : 'Elige una idea:'}
            </p>
            <button
              onClick={handleReset}
              className="text-xs text-[#9C8B7A] underline hover:text-[#4A3F35]"
            >
              Volver
            </button>
          </div>

          {ideas.map((idea, i) => (
            <button
              key={i}
              onClick={() => handlePickIdea(idea)}
              disabled={loadingRecipe}
              className="w-full rounded-2xl border border-[#E8E0D0] bg-[#F5F0EB] px-4 py-3 text-left transition-colors hover:border-[#5C7A3E] hover:bg-[#EFF5E8] disabled:opacity-50"
            >
              <div className="flex items-start justify-between gap-2">
                <p className="font-semibold text-[#2C2416]">{idea.name}</p>
                <div className="flex shrink-0 gap-1">
                  <span className="rounded-full bg-[#5C7A3E] px-2.5 py-0.5 text-xs font-medium text-white">
                    {CATEGORY_LABELS[idea.category as Category] ?? idea.category}
                  </span>
                  <span className="rounded-full bg-[#F0EAD6] px-2.5 py-0.5 text-xs font-medium text-[#5C7A3E]">
                    {idea.tag}
                  </span>
                </div>
              </div>
              <p className="mt-1 text-sm text-[#4A3F35]">{idea.description}</p>
            </button>
          ))}
        </div>
      )}

      {/* Recipe step */}
      {step === 'recipe' && draft && (
        <div className="rounded-2xl border border-[#E8E0D0]">
          {/* Header */}
          <div className="px-5 pb-3 pt-4">
            <div className="flex items-start justify-between gap-3 pr-2">
              <h2 className="text-lg font-bold text-[#2C2416]">{draft.name}</h2>
              {draft.category && (
                <span className="shrink-0 rounded-full bg-[#5C7A3E] px-3 py-0.5 text-xs font-medium text-white">
                  {CATEGORY_LABELS[draft.category as Category] ?? draft.category}
                </span>
              )}
            </div>
            {draft.tags && (draft.tags.includes('fit') || draft.tags.includes('fat')) && (
              <div className="mt-2">
                <span
                  className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                    draft.tags.includes('fit')
                      ? 'bg-[#F0EAD6] text-[#5C7A3E]'
                      : 'bg-[#F0EAD6] text-[#8B4513]'
                  }`}
                >
                  {draft.tags.includes('fit') ? '💪 Fit' : '🍔 Fat'}
                </span>
              </div>
            )}
          </div>

          {/* Body */}
          <div className="space-y-4 px-5 pb-4">
            <p className="text-xs text-[#9C8B7A]">{draft.servings ?? 2} porciones</p>

            {draft.ingredients && draft.ingredients.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="mb-2 font-semibold text-[#2C2416]">Ingredientes</h3>
                  <ul className="space-y-1.5">
                    {draft.ingredients.map((ing, i) => (
                      <li key={i} className="text-sm text-[#4A3F35]">
                        {ing.qty !== null && <span className="font-medium">{ing.qty}</span>}
                        {ing.unit && <span className="ml-1">{ing.unit}</span>}
                        <span className="ml-1">{ing.name}</span>
                        {ing.qty === null && (
                          <span className="ml-1 text-[#9C8B7A]">(al gusto)</span>
                        )}
                        {ing.note && (
                          <span className="ml-1 text-[#9C8B7A]">— {ing.note}</span>
                        )}
                      </li>
                    ))}
                  </ul>
                </div>
              </>
            )}

            {draft.steps && draft.steps.length > 0 && (
              <>
                <Separator />
                <div>
                  <h3 className="mb-2 font-semibold text-[#2C2416]">Pasos</h3>
                  <ol className="space-y-3">
                    {draft.steps.map((step) => (
                      <li key={step.order} className="text-sm">
                        <p className="font-medium text-[#2C2416]">
                          {step.order}. {step.title}
                        </p>
                        <p className="mt-0.5 text-[#4A3F35]">{step.content}</p>
                        {step.timer && (
                          <p className="mt-0.5 text-xs text-[#9C8B7A]">
                            Temporizador:{' '}
                            {step.timer >= 60
                              ? `${Math.floor(step.timer / 60)}m`
                              : `${step.timer}s`}
                          </p>
                        )}
                      </li>
                    ))}
                  </ol>
                </div>
              </>
            )}

            {draft.notes && (
              <>
                <Separator />
                <div>
                  <h3 className="mb-1 font-semibold text-[#2C2416]">Notas</h3>
                  <p className="text-sm text-[#4A3F35]">{draft.notes}</p>
                </div>
              </>
            )}

            {(draft.calories_per_serving != null ||
              draft.protein_per_serving != null ||
              draft.fat_per_serving != null ||
              draft.carbs_per_serving != null) && (
              <>
                <Separator />
                <div>
                  <h3 className="mb-2 font-semibold text-[#2C2416]">Macros por porción</h3>
                  <div className="flex flex-wrap gap-2">
                    {draft.calories_per_serving != null && (
                      <span className="rounded-full bg-[#F0EAD6] px-3 py-0.5 text-xs font-medium text-[#5C7A3E]">
                        {draft.calories_per_serving} kcal
                      </span>
                    )}
                    {draft.protein_per_serving != null && (
                      <span className="rounded-full bg-[#F0EAD6] px-3 py-0.5 text-xs font-medium text-[#5C7A3E]">
                        {draft.protein_per_serving}g proteína
                      </span>
                    )}
                    {draft.fat_per_serving != null && (
                      <span className="rounded-full bg-[#F0EAD6] px-3 py-0.5 text-xs font-medium text-[#5C7A3E]">
                        {draft.fat_per_serving}g grasa
                      </span>
                    )}
                    {draft.carbs_per_serving != null && (
                      <span className="rounded-full bg-[#F0EAD6] px-3 py-0.5 text-xs font-medium text-[#5C7A3E]">
                        {draft.carbs_per_serving}g carbos
                      </span>
                    )}
                  </div>
                </div>
              </>
            )}

            {/* Refinement */}
            <Separator />
            <div>
              <p className="mb-1.5 text-xs font-semibold uppercase tracking-wide text-[#9C8B7A]">
                Ajustar receta
              </p>
              <div className="flex gap-2">
                <input
                  value={refinement}
                  onChange={(e) => setRefinement(e.target.value)}
                  placeholder="ej. agregar frutillas, sin gluten, más picante..."
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleRefine();
                    }
                  }}
                  className="flex-1 rounded-xl border border-[#E8E0D0] bg-[#F5F0EB] px-3 py-2 text-sm text-[#2C2416] outline-none placeholder:text-[#9C8B7A] focus:ring-2 focus:ring-[#5C7A3E]/40"
                />
                <button
                  onClick={handleRefine}
                  disabled={refining || !refinement.trim()}
                  className="shrink-0 rounded-full bg-[#5C7A3E] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#4a6433] disabled:opacity-60"
                >
                  {refining ? '...' : 'Actualizar'}
                </button>
              </div>
            </div>

            <Separator />

            {/* Actions */}
            <div className="flex gap-2">
              <button
                onClick={handleSave}
                disabled={saving}
                className="flex-1 rounded-full bg-[#5C7A3E] py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#4a6433] disabled:opacity-60"
              >
                {saving ? 'Guardando...' : 'Guardar receta'}
              </button>
              <button
                onClick={handleReset}
                className="rounded-full border border-[#E8E0D0] bg-[#F5F0EB] px-4 py-2.5 text-sm font-semibold text-[#2C2416] transition-colors hover:bg-[#E8E0D0]"
              >
                Descartar
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
