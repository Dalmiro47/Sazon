'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Separator } from '@/components/ui/separator';
import {
  startSessionAction,
  chatInSessionAction,
  endSessionAction,
  getSessionAction,
} from '@/app/actions/session';
import { upsertRecipeAction } from '@/app/actions/recipe';
import type { Recipe, RecipePayload, SessionMessage, SessionEndResult } from '@/types/recipe';

type Phase = 'idle' | 'chatting' | 'ending' | 'review';

const SESSION_STORAGE_KEY = (recipeId: string) => `cooking-session-${recipeId}`;

function formatQty(qty: number): string {
  const n = Math.round(qty * 100) / 100;
  return n % 1 === 0 ? String(n) : n.toFixed(2).replace(/\.?0+$/, '');
}

interface Props {
  recipe: Recipe;
  cookServings?: number;
}

export function CookingSessionPanel({ recipe, cookServings }: Props) {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SessionMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [endResult, setEndResult] = useState<SessionEndResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recipeExpanded, setRecipeExpanded] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const servings = cookServings ?? recipe.servings;
  const scale = servings / recipe.servings;

  // Resume existing session or auto-start a new one
  useEffect(() => {
    const stored = localStorage.getItem(SESSION_STORAGE_KEY(recipe.id));

    if (stored) {
      let resuming = true;
      getSessionAction(stored).then((data) => {
        if (!resuming) return;
        if (data && data.messages.length > 0) {
          setSessionId(stored);
          setMessages(data.messages);
          setPhase('chatting');
        } else {
          localStorage.removeItem(SESSION_STORAGE_KEY(recipe.id));
          autoStart();
        }
      });
      return () => { resuming = false; };
    }

    autoStart();

    function autoStart() {
      setLoading(true);
      setError(null);
      startSessionAction(recipe.id).then((result) => {
        setLoading(false);
        if (!result.ok) {
          setError(result.message);
          return;
        }
        localStorage.setItem(SESSION_STORAGE_KEY(recipe.id), result.sessionId);
        setSessionId(result.sessionId);
        setMessages([]);
        setPhase('chatting');
      });
    }
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [recipe.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!sessionId || !input.trim() || loading) return;

    const userMsg = input.trim();
    setInput('');
    setMessages((prev) => [...prev, { role: 'user', content: userMsg }]);
    setLoading(true);
    setError(null);

    const result = await chatInSessionAction(sessionId, userMsg);
    setLoading(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    setMessages((prev) => [...prev, { role: 'assistant', content: result.reply }]);
  }, [sessionId, input, loading]);

  async function handleEnd() {
    if (!sessionId) return;

    setPhase('ending');
    setLoading(true);
    setError(null);

    const result = await endSessionAction(sessionId);
    setLoading(false);

    if (!result.ok) {
      setError(result.message);
      setPhase('chatting');
      return;
    }

    localStorage.removeItem(SESSION_STORAGE_KEY(recipe.id));
    setEndResult(result);
    setPhase('review');
  }

  async function handleApply(redirectToEdit = false) {
    if (!endResult) return;

    setLoading(true);
    setError(null);

    const payload: RecipePayload = {
      ...endResult.improved_recipe,
      id: recipe.id,
    };

    const result = await upsertRecipeAction(payload);
    setLoading(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    if (redirectToEdit) {
      router.push(`/recipes/${recipe.slug}/edit`);
    } else {
      router.push(`/recipes/${recipe.slug}`);
    }
    router.refresh();
  }

  function handleKeepOriginal() {
    router.push(`/recipes/${recipe.slug}`);
  }

  function handleKeyDown(e: React.KeyboardEvent) {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  }

  // --- IDLE PHASE (auto-starting) ---
  if (phase === 'idle') {
    return (
      <div className="flex h-[50vh] items-center justify-center">
        <div className="text-center">
          <p className="text-sm text-[#9C8B7A]">{loading ? 'Iniciando sesión...' : 'Cargando...'}</p>
          {error && (
            <p className="mt-2 text-sm text-red-600">{error}</p>
          )}
        </div>
      </div>
    );
  }

  // --- ENDING PHASE ---
  if (phase === 'ending') {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-semibold text-[#2C2416]">Generando resumen...</p>
          <p className="mt-1 text-sm text-[#9C8B7A]">Analizando la sesión de cocina</p>
        </div>
      </div>
    );
  }

  // --- REVIEW PHASE ---
  if (phase === 'review' && endResult) {
    return (
      <div className="space-y-5">
        <div>
          <h1 className="text-2xl font-bold text-[#2C2416]">Resumen de la sesión</h1>
          <p className="mt-1 text-sm text-[#9C8B7A]">{recipe.name}</p>
        </div>

        <div className="rounded-2xl border border-[#E8E0D0] bg-[#FAF6EF] p-5">
          <p className="mb-1 text-xs font-semibold uppercase tracking-wide text-[#9C8B7A]">Resumen</p>
          <p className="text-sm text-[#4A3F35]">{endResult.summary}</p>
        </div>

        <DiffPreview current={recipe} proposed={endResult.improved_recipe} />

        {error && <p className="text-sm text-red-600">{error}</p>}

        <div className="flex flex-col gap-2">
          <button
            onClick={() => handleApply(false)}
            disabled={loading}
            className="w-full rounded-full bg-[#5C7A3E] py-3 text-sm font-bold text-white transition-colors hover:bg-[#4a6433] disabled:opacity-60"
          >
            {loading ? 'Aplicando...' : 'Aplicar mejoras'}
          </button>
          <button
            onClick={() => handleApply(true)}
            disabled={loading}
            className="w-full rounded-full border border-[#E8E0D0] bg-white py-3 text-sm font-semibold text-[#2C2416] transition-colors hover:bg-[#F5F0EB] disabled:opacity-60"
          >
            Editar antes de guardar
          </button>
          <button
            onClick={handleKeepOriginal}
            disabled={loading}
            className="w-full py-2.5 text-sm text-[#9C8B7A] transition-colors hover:text-[#2C2416] disabled:opacity-60"
          >
            Mantener original
          </button>
        </div>
      </div>
    );
  }

  // --- CHATTING PHASE ---
  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* Header */}
      <div className="mb-3">
        <button
          onClick={handleEnd}
          disabled={loading}
          className="shrink-0 rounded-full bg-[#5C7A3E] px-4 py-1.5 text-xs font-bold text-white transition-colors hover:bg-[#4a6433] disabled:opacity-60"
        >
          Terminé de cocinar
        </button>
        <div className="mt-2">
          <button
            onClick={() => setRecipeExpanded((v) => !v)}
            className="text-xs font-medium text-[#5C7A3E] hover:underline"
          >
            {recipeExpanded ? 'Ocultar receta' : 'Ver receta'}
          </button>
        </div>
      </div>

      {/* Collapsible recipe panel */}
      {recipeExpanded && (
        <div className="mb-3 max-h-48 overflow-y-auto rounded-2xl border border-[#E8E0D0] bg-[#FAF6EF] p-4 text-sm">
          <p className="mb-1 font-semibold text-[#2C2416]">
            Ingredientes
            {scale !== 1 && (
              <span className="ml-2 text-xs font-normal text-[#9C8B7A]">
                ({servings} {servings === 1 ? 'porción' : 'porciones'})
              </span>
            )}
          </p>
          <ul className="mb-3 space-y-0.5 text-xs text-[#4A3F35]">
            {recipe.ingredients.map((ing, i) => (
              <li key={i}>
                {ing.qty !== null && <span className="font-medium">{formatQty(ing.qty * scale)} </span>}
                {ing.unit && <span>{ing.unit} </span>}
                {ing.name}
                {ing.note && <span className="text-[#9C8B7A]"> — {ing.note}</span>}
              </li>
            ))}
          </ul>
          <p className="mb-1 font-semibold text-[#2C2416]">Pasos</p>
          <ol className="space-y-0.5 text-xs text-[#4A3F35]">
            {recipe.steps.map((s) => (
              <li key={s.order}>
                <span className="font-medium">{s.order}. {s.title}: </span>
                {s.content}
              </li>
            ))}
          </ol>
        </div>
      )}

      {/* Messages */}
      <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-2xl border border-[#E8E0D0] bg-[#FAF6EF] p-4">
        <div className="space-y-3">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-2xl px-4 py-2.5 text-sm ${
                  msg.role === 'user'
                    ? 'bg-[#5C7A3E] text-white'
                    : 'border border-[#E8E0D0] bg-[#FEF9F4] text-[#2C2416]'
                }`}
              >
                {msg.role === 'assistant' ? (
                  <MarkdownText content={msg.content} />
                ) : (
                  <p className="whitespace-pre-wrap">{msg.content}</p>
                )}
              </div>
            </div>
          ))}
          {loading && (
            <div className="flex justify-start">
              <div className="rounded-2xl border border-[#E8E0D0] bg-[#FEF9F4] px-4 py-2.5 text-sm text-[#9C8B7A]">
                Pensando... 🤔
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </div>

      {error && <p className="mt-1 text-sm text-red-600">{error}</p>}

      {/* Input bar */}
      <div className="mt-3 flex gap-2">
        <input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe tu mensaje..."
          disabled={loading}
          className="flex-1 rounded-full border border-[#E8E0D0] bg-[#FAF6EF] px-4 py-2.5 text-sm outline-none placeholder:text-[#9C8B7A] focus:ring-2 focus:ring-[#5C7A3E]/40 disabled:opacity-60"
        />
        <button
          onClick={handleSend}
          disabled={loading || !input.trim()}
          className="rounded-full bg-[#5C7A3E] px-5 py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#4a6433] disabled:opacity-40"
        >
          Enviar
        </button>
      </div>
    </div>
  );
}

// --- Markdown renderer ---
// Handles **bold**, *italic*, bullet lists (- / *), numbered lists, line breaks

function MarkdownText({ content }: { content: string }) {
  const lines = content.split('\n');

  return (
    <div className="space-y-1">
      {lines.map((line, i) => {
        const trimmed = line.trimStart();

        // Bullet list item
        if (/^[-*•]\s/.test(trimmed)) {
          return (
            <div key={i} className="flex gap-1.5">
              <span className="mt-0.5 shrink-0">•</span>
              <span>{renderInline(trimmed.replace(/^[-*•]\s/, ''))}</span>
            </div>
          );
        }

        // Numbered list item
        const numMatch = trimmed.match(/^(\d+)\.\s(.*)/);
        if (numMatch) {
          return (
            <div key={i} className="flex gap-1.5">
              <span className="mt-0.5 shrink-0 font-medium">{numMatch[1]}.</span>
              <span>{renderInline(numMatch[2])}</span>
            </div>
          );
        }

        // Empty line → spacer
        if (!trimmed) return <div key={i} className="h-1" />;

        // Regular paragraph
        return <p key={i}>{renderInline(line)}</p>;
      })}
    </div>
  );
}

function renderInline(text: string): React.ReactNode[] {
  const parts: React.ReactNode[] = [];
  const regex = /(\*\*(.+?)\*\*|\*(.+?)\*)/g;
  let last = 0;
  let match: RegExpExecArray | null;

  while ((match = regex.exec(text)) !== null) {
    if (match.index > last) {
      parts.push(text.slice(last, match.index));
    }
    if (match[0].startsWith('**')) {
      parts.push(<strong key={match.index}>{match[2]}</strong>);
    } else {
      parts.push(<em key={match.index}>{match[3]}</em>);
    }
    last = match.index + match[0].length;
  }

  if (last < text.length) parts.push(text.slice(last));
  return parts;
}

// --- Diff Preview ---

function DiffPreview({
  current,
  proposed,
}: {
  current: Recipe;
  proposed: RecipePayload;
}) {
  const changes: { label: string; current: string; proposed: string }[] = [];

  if (proposed.notes !== undefined && proposed.notes !== current.notes) {
    changes.push({
      label: 'Notas',
      current: current.notes ?? '(sin notas)',
      proposed: proposed.notes ?? '(sin notas)',
    });
  }

  if (proposed.steps !== undefined) {
    const fmt = (steps: Recipe['steps']) =>
      steps.map((s) => `${s.order}. ${s.title}: ${s.content}`).join('\n');
    const cur = fmt(current.steps);
    const prop = fmt(proposed.steps);
    if (cur !== prop) changes.push({ label: 'Pasos', current: cur, proposed: prop });
  }

  if (proposed.ingredients !== undefined) {
    const fmt = (ings: { qty: number | null; unit: string | null; name: string }[]) =>
      ings.map((i) => `${i.qty ?? ''} ${i.unit ?? ''} ${i.name}`.trim()).join('\n');
    const cur = fmt(current.ingredients);
    const prop = fmt(proposed.ingredients);
    if (cur !== prop) changes.push({ label: 'Ingredientes', current: cur, proposed: prop });
  }

  const macroLabels = [
    { key: 'calories_per_serving' as const, label: 'Calorías/porción' },
    { key: 'protein_per_serving' as const, label: 'Proteína (g)' },
    { key: 'fat_per_serving' as const, label: 'Grasa (g)' },
    { key: 'carbs_per_serving' as const, label: 'Carbohidratos (g)' },
  ];

  const macroChanges = macroLabels.filter(
    ({ key }) => proposed[key] !== undefined && proposed[key] !== current[key]
  );

  if (macroChanges.length > 0) {
    changes.push({
      label: 'Macros',
      current: macroChanges.map(({ key, label }) => `${label}: ${current[key] ?? '-'}`).join('\n'),
      proposed: macroChanges.map(({ key, label }) => `${label}: ${proposed[key] ?? '-'}`).join('\n'),
    });
  }

  if (changes.length === 0) {
    return (
      <div className="rounded-2xl border border-[#E8E0D0] bg-[#FAF6EF] p-5">
        <p className="text-sm text-[#9C8B7A]">No se sugirieron cambios a la receta.</p>
      </div>
    );
  }

  return (
    <div className="space-y-3">
      {changes.map((change) => (
        <div key={change.label} className="rounded-2xl border border-[#E8E0D0] bg-[#FAF6EF] p-4">
          <p className="mb-3 text-xs font-semibold uppercase tracking-wide text-[#9C8B7A]">{change.label}</p>
          <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
            <div>
              <p className="mb-1 text-xs font-medium text-[#9C8B7A]">Actual</p>
              <p className="whitespace-pre-wrap text-sm text-[#4A3F35]">{change.current}</p>
            </div>
            <div>
              <Separator className="mb-3 sm:hidden" />
              <p className="mb-1 text-xs font-medium text-[#5C7A3E]">Sugerido</p>
              <p className="whitespace-pre-wrap text-sm text-[#4A3F35]">{change.proposed}</p>
            </div>
          </div>
        </div>
      ))}
    </div>
  );
}
