'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Separator } from '@/components/ui/separator';
import { suggestRecipeAction } from '@/app/actions/suggest-recipe';
import { upsertRecipeAction } from '@/app/actions/recipe';
import { CATEGORY_LABELS } from '@/types/constants';
import type { Category } from '@/types/constants';
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
      toast.success('¡Receta guardada!');
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
    <div className="space-y-5">
      {/* Input row */}
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
                handleSuggest();
              }
            }}
            className="flex-1 rounded-xl border border-[#E8E0D0] bg-[#F5F0EB] px-3 py-2 text-sm text-[#2C2416] outline-none placeholder:text-[#9C8B7A] focus:ring-2 focus:ring-[#5C7A3E]/40"
          />
          <button
            onClick={handleSuggest}
            disabled={loading}
            className="rounded-full bg-[#5C7A3E] px-5 py-2 text-sm font-bold text-white transition-colors hover:bg-[#4a6433] disabled:opacity-60"
          >
            {loading ? 'Pensando...' : 'Sugerir'}
          </button>
        </div>
      </div>

      {/* Draft preview — matches recipe detail dialog style */}
      {draft && (
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
            {draft.tags && draft.tags.length > 0 && (
              <div className="mt-2 flex flex-wrap gap-1">
                {draft.tags.map((tag) => (
                  <span
                    key={tag}
                    className="rounded-full bg-[#F0EAD6] px-2.5 py-0.5 text-xs font-medium text-[#5C7A3E]"
                  >
                    {tag}
                  </span>
                ))}
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
                            Temporizador: {step.timer >= 60 ? `${Math.floor(step.timer / 60)}m` : `${step.timer}s`}
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
                onClick={handleDiscard}
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
