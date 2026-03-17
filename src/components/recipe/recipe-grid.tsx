'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Trash2, Search, Plus, Sparkles, FileDown } from 'lucide-react';
import { CATEGORY_LABELS, ALLOWED_CATEGORIES } from '@/types/constants';
import { deleteRecipeAction } from '@/app/actions/recipe';
import type { Recipe } from '@/types/recipe';
import type { Category } from '@/types/constants';
import {
  MobileDialog,
  MobileDialogContent,
  MobileDialogHeader,
  MobileDialogTitle,
  MobileDialogFooter,
} from '@/components/ui/mobile-dialog';
import { Separator } from '@/components/ui/separator';
import { RecipeForm } from '@/components/recipe/recipe-form';
import { SuggestRecipe } from '@/components/recipe/suggest-recipe';
import { ImportRecipe } from '@/components/recipe/import-recipe';

interface RecipeGridProps {
  recipes: Recipe[];
}

export function RecipeGrid({ recipes }: RecipeGridProps) {
  const [query, setQuery] = useState('');
  const [categoryFilter, setCategoryFilter] = useState<Category | 'all'>('all');
  const [fitFatFilter, setFitFatFilter] = useState<'fit' | 'fat' | null>(null);
  const [pending, startTransition] = useTransition();
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [showAddDialog, setShowAddDialog] = useState(false);
  const [showSuggestDialog, setShowSuggestDialog] = useState(false);
  const [showImportDialog, setShowImportDialog] = useState(false);
  const router = useRouter();

  const filtered = recipes.filter((r) => {
    const matchesCategory = categoryFilter === 'all' || r.category === categoryFilter;
    if (!matchesCategory) return false;
    if (fitFatFilter && !r.tags.includes(fitFatFilter)) return false;
    if (!query.trim()) return true;
    const q = query.toLowerCase();
    return r.name.toLowerCase().includes(q);
  });

  function handleDelete(recipe: Recipe) {
    if (!window.confirm(`¿Eliminar ${recipe.name}?`)) return;
    startTransition(async () => {
      await deleteRecipeAction(recipe.id);
      setSelectedRecipe(null);
      router.refresh();
    });
  }

  return (
    <>
      {/* Sugerir + Importar + Agregar — same row, same size */}
      <div className="mb-4 flex gap-2">
        <button
          onClick={() => setShowSuggestDialog(true)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-[#5C7A3E]/40 bg-[#F5F0EB] py-2.5 text-sm font-semibold text-[#2C2416] transition-colors hover:bg-[#E8E0D0]"
        >
          <Sparkles size={16} className="text-[#5C7A3E]" />
          Sugerir
        </button>
        <button
          onClick={() => setShowImportDialog(true)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-full border border-[#5C7A3E]/40 bg-[#F5F0EB] py-2.5 text-sm font-semibold text-[#2C2416] transition-colors hover:bg-[#E8E0D0]"
        >
          <FileDown size={16} className="text-[#5C7A3E]" />
          Importar
        </button>
        <button
          onClick={() => setShowAddDialog(true)}
          className="flex flex-1 items-center justify-center gap-1.5 rounded-full bg-[#5C7A3E] py-2.5 text-sm font-bold text-white shadow-sm transition-colors hover:bg-[#4a6433]"
        >
          <Plus size={16} />
          Agregar
        </button>
      </div>

      {/* Search */}
      <div className="relative mb-3">
        <Search
          size={18}
          className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-[#9C8B7A]"
        />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar recetas..."
          className="w-full rounded-full bg-[#F5F0EB] py-3 pl-11 pr-5 text-sm outline-none placeholder:text-[#9C8B7A] focus:ring-2 focus:ring-[#5C7A3E]/40"
        />
      </div>

      {/* Category filter */}
      <div className="mb-3 flex flex-wrap gap-2">
        <button
          onClick={() => setCategoryFilter('all')}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            categoryFilter === 'all'
              ? 'bg-[#5C7A3E] text-white'
              : 'bg-[#F0EAD6] text-[#5C7A3E] hover:bg-[#5C7A3E]/20'
          }`}
        >
          Todas
        </button>
        {ALLOWED_CATEGORIES.map((cat) => (
          <button
            key={cat}
            onClick={() => setCategoryFilter(cat === categoryFilter ? 'all' : cat)}
            className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
              categoryFilter === cat
                ? 'bg-[#5C7A3E] text-white'
                : 'bg-[#F0EAD6] text-[#5C7A3E] hover:bg-[#5C7A3E]/20'
            }`}
          >
            {CATEGORY_LABELS[cat]}
          </button>
        ))}
      </div>

      {/* Fit / Fat filter */}
      <div className="mb-6 flex gap-2">
        <button
          onClick={() => setFitFatFilter(fitFatFilter === 'fit' ? null : 'fit')}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            fitFatFilter === 'fit'
              ? 'bg-[#5C7A3E] text-white'
              : 'bg-[#F0EAD6] text-[#5C7A3E] hover:bg-[#5C7A3E]/20'
          }`}
        >
          💪 Fit
        </button>
        <button
          onClick={() => setFitFatFilter(fitFatFilter === 'fat' ? null : 'fat')}
          className={`rounded-full px-3 py-1 text-xs font-medium transition-colors ${
            fitFatFilter === 'fat'
              ? 'bg-[#8B4513] text-white'
              : 'bg-[#F0EAD6] text-[#8B4513] hover:bg-[#8B4513]/20'
          }`}
        >
          🍔 Fat
        </button>
      </div>

      {filtered.length === 0 ? (
        <p className="text-[#9C8B7A]">
          {query || categoryFilter !== 'all' || fitFatFilter
            ? 'Sin resultados.'
            : 'Aún no hay recetas. ¡Agrega la primera!'}
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2">
          {filtered.map((recipe) => (
            <div
              key={recipe.id}
              className="group relative cursor-pointer"
              data-testid="recipe-card"
              onClick={() => setSelectedRecipe(recipe)}
            >
              <div className="rounded-2xl border border-[#E8E0D0] bg-[#FAF6EF] transition-transform hover:-translate-y-1">
                <div className="p-5 pb-3">
                  <div className="flex items-start justify-between gap-2">
                    <h2 className="text-base font-semibold leading-snug text-[#2C2416]">
                      {recipe.name}
                    </h2>
                    <div className="flex shrink-0 gap-1">
                      <span
                        data-testid="category-badge"
                        className="whitespace-nowrap rounded-full bg-[#5C7A3E] px-2.5 py-0.5 text-xs font-medium text-white"
                      >
                        {CATEGORY_LABELS[recipe.category as Category] ?? recipe.category}
                      </span>
                      {recipe.tags.includes('fit') && (
                        <span className="whitespace-nowrap rounded-full bg-[#F0EAD6] px-2 py-0.5 text-xs font-medium text-[#5C7A3E]">
                          💪
                        </span>
                      )}
                      {recipe.tags.includes('fat') && (
                        <span className="whitespace-nowrap rounded-full bg-[#F0EAD6] px-2 py-0.5 text-xs font-medium text-[#8B4513]">
                          🍔
                        </span>
                      )}
                    </div>
                  </div>
                </div>
                <div className="px-5 pb-5">
                  <div className="flex items-center justify-between">
                    <p className="text-xs text-[#9C8B7A]">
                      {recipe.ingredients.length} ingredientes · {recipe.steps.length} pasos ·{' '}
                      {recipe.servings} porciones
                    </p>
                    <button
                      disabled={pending}
                      onClick={(e) => {
                        e.stopPropagation();
                        handleDelete(recipe);
                      }}
                      className="rounded-full p-1 opacity-0 transition-opacity group-hover:opacity-100 hover:bg-red-50 disabled:cursor-not-allowed"
                      aria-label="Eliminar"
                    >
                      <Trash2 size={14} className="text-[#9C8B7A] hover:text-red-500" />
                    </button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* ── Recipe Detail Dialog ── */}
      <MobileDialog open={!!selectedRecipe} onOpenChange={(open) => !open && setSelectedRecipe(null)}>
        <MobileDialogContent>
          {selectedRecipe && (
            <>
              <MobileDialogHeader>
                <div className="flex items-start justify-between gap-3 pr-8">
                  <MobileDialogTitle>{selectedRecipe.name}</MobileDialogTitle>
                  <span className="shrink-0 rounded-full bg-[#5C7A3E] px-3 py-0.5 text-xs font-medium text-white">
                    {CATEGORY_LABELS[selectedRecipe.category as Category] ?? selectedRecipe.category}
                  </span>
                </div>
                {(selectedRecipe.tags.includes('fit') || selectedRecipe.tags.includes('fat')) && (
                  <div className="mt-2">
                    <span
                      className={`rounded-full px-2.5 py-0.5 text-xs font-medium ${
                        selectedRecipe.tags.includes('fit')
                          ? 'bg-[#F0EAD6] text-[#5C7A3E]'
                          : 'bg-[#F0EAD6] text-[#8B4513]'
                      }`}
                    >
                      {selectedRecipe.tags.includes('fit') ? '💪 Fit' : '🍔 Fat'}
                    </span>
                  </div>
                )}
              </MobileDialogHeader>

              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                <div className="space-y-4 px-5 pb-4">
                  <div className="flex gap-3 text-sm text-[#9C8B7A]">
                    <span>{selectedRecipe.servings} porciones</span>
                    {selectedRecipe.source && <span>· {selectedRecipe.source}</span>}
                  </div>

                  {selectedRecipe.ingredients.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="mb-2 font-semibold text-[#2C2416]">Ingredientes</h3>
                        <ul className="space-y-1.5">
                          {selectedRecipe.ingredients.map((ing, i) => (
                            <li key={i} className="text-sm text-[#4A3F35]">
                              {ing.qty !== null && (
                                <span className="font-medium">{ing.qty}</span>
                              )}
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

                  {selectedRecipe.steps.length > 0 && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="mb-2 font-semibold text-[#2C2416]">Pasos</h3>
                        <ol className="space-y-3">
                          {selectedRecipe.steps.map((step) => (
                            <li key={step.order} className="text-sm">
                              <p className="font-medium text-[#2C2416]">
                                {step.order}. {step.title}
                              </p>
                              <p className="mt-0.5 text-[#4A3F35]">{step.content}</p>
                            </li>
                          ))}
                        </ol>
                      </div>
                    </>
                  )}

                  {selectedRecipe.notes && (
                    <>
                      <Separator />
                      <div>
                        <h3 className="mb-1 font-semibold text-[#2C2416]">Notas</h3>
                        <p className="text-sm text-[#4A3F35]">{selectedRecipe.notes}</p>
                      </div>
                    </>
                  )}
                </div>
              </div>

              <MobileDialogFooter className="flex items-center justify-between">
                <button
                  disabled={pending}
                  onClick={() => handleDelete(selectedRecipe)}
                  className="flex items-center gap-1.5 rounded-full px-3 py-1.5 text-sm text-red-500 transition-colors hover:bg-red-50 disabled:opacity-50"
                >
                  <Trash2 size={14} />
                  Eliminar
                </button>
                <div className="flex gap-2">
                  <Link
                    href={`/recipes/${selectedRecipe.slug}/edit`}
                    className="rounded-full border border-[#E8E0D0] px-4 py-2 text-sm font-medium text-[#2C2416] transition-colors hover:bg-[#F5F0EB]"
                    onClick={() => setSelectedRecipe(null)}
                  >
                    Editar
                  </Link>
                  <Link
                    href={`/recipes/${selectedRecipe.slug}/cook`}
                    className="rounded-full bg-[#5C7A3E] px-4 py-2 text-sm font-bold text-white transition-colors hover:bg-[#4a6433]"
                    onClick={() => setSelectedRecipe(null)}
                  >
                    Cocinar
                  </Link>
                </div>
              </MobileDialogFooter>
            </>
          )}
        </MobileDialogContent>
      </MobileDialog>

      {/* ── Add Recipe Dialog ── */}
      <MobileDialog open={showAddDialog} onOpenChange={setShowAddDialog}>
        <MobileDialogContent>
          <MobileDialogHeader>
            <MobileDialogTitle>Nueva receta</MobileDialogTitle>
          </MobileDialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div className="px-5 pb-6">
              <RecipeForm />
            </div>
          </div>
        </MobileDialogContent>
      </MobileDialog>

      {/* ── Suggest Recipe Dialog ── */}
      <MobileDialog open={showSuggestDialog} onOpenChange={setShowSuggestDialog}>
        <MobileDialogContent position="center">
          <MobileDialogHeader>
            <MobileDialogTitle>Sugerir una receta</MobileDialogTitle>
            <p className="mt-1 text-sm text-[#9C8B7A]">
              Cuéntanos qué tienes o qué se te antoja.
            </p>
          </MobileDialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div className="px-5 pb-6">
              <SuggestRecipe />
            </div>
          </div>
        </MobileDialogContent>
      </MobileDialog>

      {/* ── Import Recipe Dialog ── */}
      <MobileDialog open={showImportDialog} onOpenChange={setShowImportDialog}>
        <MobileDialogContent position="center">
          <MobileDialogHeader>
            <MobileDialogTitle>Importar receta</MobileDialogTitle>
            <p className="mt-1 text-sm text-[#9C8B7A]">
              Sube una foto, pega un enlace o copia el texto de una receta.
            </p>
          </MobileDialogHeader>
          <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
            <div className="px-5 pb-6">
              <ImportRecipe
                onImported={() => {
                  setShowImportDialog(false);
                  setShowAddDialog(true);
                }}
              />
            </div>
          </div>
        </MobileDialogContent>
      </MobileDialog>
    </>
  );
}
