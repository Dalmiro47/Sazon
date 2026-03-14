'use client';

import { useState, useEffect } from 'react';
import type { RecipeStep } from '@/types/recipe';

interface StepTrackerProps {
  slug: string;
  steps: RecipeStep[];
}

function getStorageKey(slug: string): string {
  return `recipe-progress-${slug}`;
}

export function StepTracker({ slug, steps }: StepTrackerProps) {
  const [completed, setCompleted] = useState<number[]>([]);

  useEffect(() => {
    try {
      const stored = localStorage.getItem(getStorageKey(slug));
      if (stored) {
        setCompleted(JSON.parse(stored));
      }
    } catch {
      // localStorage not available or corrupt data
    }
  }, [slug]);

  function toggleStep(order: number) {
    setCompleted((prev) => {
      const next = prev.includes(order)
        ? prev.filter((o) => o !== order)
        : [...prev, order];
      try {
        localStorage.setItem(getStorageKey(slug), JSON.stringify(next));
      } catch {
        // localStorage not available
      }
      return next;
    });
  }

  function clearProgress() {
    setCompleted([]);
    try {
      localStorage.removeItem(getStorageKey(slug));
    } catch {
      // localStorage not available
    }
  }

  const allDone = completed.length === steps.length && steps.length > 0;

  return (
    <div>
      <div className="mb-3 flex items-center justify-between">
        <h2 className="text-lg font-semibold">Pasos</h2>
        {completed.length > 0 && (
          <button
            onClick={clearProgress}
            className="text-xs text-muted-foreground hover:text-foreground"
          >
            Borrar progreso
          </button>
        )}
      </div>

      {allDone && (
        <p className="mb-3 text-sm font-medium text-green-600">
          ¡Todos los pasos completados!
        </p>
      )}

      <ol className="space-y-4">
        {steps.map((step) => {
          const isDone = completed.includes(step.order);
          return (
            <li key={step.order} className="flex gap-3">
              <button
                onClick={() => toggleStep(step.order)}
                className={`mt-1 flex h-5 w-5 shrink-0 items-center justify-center rounded border text-xs ${
                  isDone
                    ? 'border-primary bg-primary text-primary-foreground'
                    : 'border-input'
                }`}
              >
                {isDone ? '✓' : step.order}
              </button>
              <div className={isDone ? 'opacity-60' : ''}>
                <p className="font-medium">{step.title}</p>
                <p className="mt-1 text-sm text-muted-foreground">
                  {step.content}
                </p>
                {step.timer && (
                  <p className="mt-1 text-xs text-muted-foreground">
                    Temporizador: {step.timer >= 60 ? `${Math.floor(step.timer / 60)}m` : ''}{step.timer % 60 > 0 ? `${step.timer % 60}s` : ''}
                  </p>
                )}
              </div>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
