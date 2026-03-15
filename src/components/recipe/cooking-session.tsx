'use client';

import { useState, useRef, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { ScrollArea } from '@/components/ui/scroll-area';
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

interface Props {
  recipe: Recipe;
}

export function CookingSessionPanel({ recipe }: Props) {
  const router = useRouter();
  const [sessionId, setSessionId] = useState<string | null>(null);
  const [messages, setMessages] = useState<SessionMessage[]>([]);
  const [input, setInput] = useState('');
  const [loading, setLoading] = useState(false);
  const [phase, setPhase] = useState<Phase>('idle');
  const [endResult, setEndResult] = useState<SessionEndResult | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [recipeExpanded, setRecipeExpanded] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  // Resume session from localStorage on mount
  useEffect(() => {
    const stored = localStorage.getItem(SESSION_STORAGE_KEY(recipe.id));
    if (!stored) return;

    let resuming = true;
    getSessionAction(stored).then((data) => {
      if (!resuming) return;
      if (data && data.messages.length > 0) {
        setSessionId(stored);
        setMessages(data.messages);
        setPhase('chatting');
      } else {
        localStorage.removeItem(SESSION_STORAGE_KEY(recipe.id));
      }
    });

    return () => { resuming = false; };
  }, [recipe.id]);

  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  async function handleStart() {
    setLoading(true);
    setError(null);
    const result = await startSessionAction(recipe.id);
    setLoading(false);

    if (!result.ok) {
      setError(result.message);
      return;
    }

    localStorage.setItem(SESSION_STORAGE_KEY(recipe.id), result.sessionId);
    setSessionId(result.sessionId);
    setMessages([]);
    setPhase('chatting');
  }

  function handleNewSession() {
    localStorage.removeItem(SESSION_STORAGE_KEY(recipe.id));
    setSessionId(null);
    setMessages([]);
    setPhase('idle');
  }

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

  // --- IDLE PHASE ---
  if (phase === 'idle') {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">{recipe.name}</h1>
          <p className="mt-1 text-sm text-muted-foreground">¿Listo para cocinar?</p>
        </div>

        <Card>
          <CardContent className="pt-6">
            <p className="mb-4 text-sm text-muted-foreground">
              Chatea con la IA mientras cocinas. Al final, recibirás un resumen
              y una receta mejorada basada en lo que aprendiste.
            </p>
            <Button onClick={handleStart} disabled={loading} className="w-full">
              {loading ? 'Iniciando...' : 'Empezar sesión de cocina'}
            </Button>
            {error && <p className="mt-2 text-sm text-destructive">{error}</p>}
          </CardContent>
        </Card>
      </div>
    );
  }

  // --- ENDING PHASE ---
  if (phase === 'ending') {
    return (
      <div className="flex h-[70vh] items-center justify-center">
        <div className="text-center">
          <p className="text-lg font-medium">Generando resumen...</p>
          <p className="mt-1 text-sm text-muted-foreground">Analizando la sesión de cocina</p>
        </div>
      </div>
    );
  }

  // --- REVIEW PHASE ---
  if (phase === 'review' && endResult) {
    return (
      <div className="space-y-6">
        <div>
          <h1 className="text-2xl font-bold">Resumen de la sesión</h1>
          <p className="mt-1 text-sm text-muted-foreground">{recipe.name}</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle className="text-lg">Resumen</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-sm">{endResult.summary}</p>
          </CardContent>
        </Card>

        <DiffPreview current={recipe} proposed={endResult.improved_recipe} />

        {error && <p className="text-sm text-destructive">{error}</p>}

        <div className="flex flex-col gap-2 sm:flex-row">
          <Button onClick={() => handleApply(false)} disabled={loading} className="flex-1">
            {loading ? 'Aplicando...' : 'Aplicar mejoras'}
          </Button>
          <Button
            variant="outline"
            onClick={() => handleApply(true)}
            disabled={loading}
            className="flex-1"
          >
            Editar antes de guardar
          </Button>
          <Button
            variant="ghost"
            onClick={handleKeepOriginal}
            disabled={loading}
            className="flex-1"
          >
            Mantener original
          </Button>
        </div>
      </div>
    );
  }

  // --- CHATTING PHASE ---
  return (
    <div className="flex h-[calc(100vh-8rem)] flex-col">
      {/* Header */}
      <div className="mb-2 flex items-center justify-between gap-2">
        <div>
          <h1 className="text-lg font-bold">{recipe.name}</h1>
          <p className="text-xs text-muted-foreground">Sesión de cocina activa</p>
        </div>
        <div className="flex shrink-0 gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setRecipeExpanded((v) => !v)}
            className="text-xs"
          >
            {recipeExpanded ? 'Ocultar receta' : 'Ver receta'}
          </Button>
          <Button variant="ghost" size="sm" onClick={handleNewSession} className="text-xs">
            Nueva sesión
          </Button>
          <Button variant="outline" size="sm" onClick={handleEnd} disabled={loading}>
            Terminé de cocinar
          </Button>
        </div>
      </div>

      {/* Collapsible recipe panel */}
      {recipeExpanded && (
        <div className="mb-2 max-h-48 overflow-y-auto rounded-md border bg-muted/40 p-3 text-sm">
          <p className="mb-1 font-medium">Ingredientes</p>
          <ul className="mb-2 space-y-0.5 text-xs">
            {recipe.ingredients.map((ing, i) => (
              <li key={i}>
                {ing.qty !== null && <span className="font-medium">{ing.qty} </span>}
                {ing.unit && <span>{ing.unit} </span>}
                {ing.name}
                {ing.note && <span className="text-muted-foreground"> — {ing.note}</span>}
              </li>
            ))}
          </ul>
          <p className="mb-1 font-medium">Pasos</p>
          <ol className="space-y-0.5 text-xs">
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
      <ScrollArea className="flex-1 rounded-md border p-4">
        <div className="space-y-3">
          {messages.map((msg, i) => (
            <div
              key={i}
              className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
            >
              <div
                className={`max-w-[85%] rounded-lg px-3 py-2 text-sm ${
                  msg.role === 'user'
                    ? 'bg-primary text-primary-foreground'
                    : 'bg-muted'
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
              <div className="rounded-lg bg-muted px-3 py-2 text-sm text-muted-foreground">
                Pensando...
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>
      </ScrollArea>

      {error && <p className="mt-1 text-sm text-destructive">{error}</p>}

      <div className="mt-3 flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Escribe tu mensaje..."
          disabled={loading}
          className="flex-1"
        />
        <Button onClick={handleSend} disabled={loading || !input.trim()}>
          Enviar
        </Button>
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
  // Process **bold** and *italic* inline
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
      <Card>
        <CardContent className="pt-6">
          <p className="text-sm text-muted-foreground">No se sugirieron cambios a la receta.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      {changes.map((change) => (
        <Card key={change.label}>
          <CardHeader>
            <CardTitle className="text-base">{change.label}</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2">
              <div>
                <p className="mb-1 text-xs font-medium text-muted-foreground">Actual</p>
                <p className="whitespace-pre-wrap text-sm">{change.current}</p>
              </div>
              <div>
                <Separator className="sm:hidden" />
                <p className="mb-1 text-xs font-medium text-muted-foreground">Sugerido</p>
                <p className="whitespace-pre-wrap text-sm">{change.proposed}</p>
              </div>
            </div>
          </CardContent>
        </Card>
      ))}
    </div>
  );
}
