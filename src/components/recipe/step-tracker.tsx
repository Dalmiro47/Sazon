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
        <h2 className="text-lg font-semibold text-[#2C2416]">Pasos</h2>
        {completed.length > 0 && (
          <button
            onClick={clearProgress}
            className="text-xs text-[#9C8B7A] hover:text-[#2C2416]"
          >
            Borrar progreso
          </button>
        )}
      </div>

      {allDone && (
        <p className="mb-3 text-sm font-medium text-[#5C7A3E]">
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
                className={`mt-0.5 flex h-6 w-6 shrink-0 items-center justify-center rounded-full border text-xs font-medium transition-colors ${
                  isDone
                    ? 'border-[#5C7A3E] bg-[#5C7A3E] text-white'
                    : 'border-[#E8E0D0] bg-[#F5F0EB] text-[#9C8B7A] hover:border-[#5C7A3E]/40'
                }`}
              >
                {isDone ? '✓' : step.order}
              </button>
              <div className={isDone ? 'opacity-50' : ''}>
                <p className="font-medium text-[#2C2416]">{step.title}</p>
                <p className="mt-0.5 text-sm text-[#4A3F35]">
                  {step.content}
                </p>
                {step.timer && (
                  <p className="mt-0.5 text-xs text-[#9C8B7A]">
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
