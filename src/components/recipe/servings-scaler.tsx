'use client';

import { useState } from 'react';
import type { Ingredient } from '@/types/recipe';

interface ServingsScalerProps {
  baseServings: number;
  ingredients: Ingredient[];
}

function formatQty(qty: number): string {
  // Show clean numbers: 1.5 not 1.500000001
  const rounded = Math.round(qty * 100) / 100;
  return rounded % 1 === 0 ? rounded.toString() : rounded.toFixed(2).replace(/0+$/, '');
}

export function ServingsScaler({ baseServings, ingredients }: ServingsScalerProps) {
  const [servings, setServings] = useState(baseServings);
  const scale = servings / baseServings;

  return (
    <div>
      <div className="mb-4 flex items-center gap-3">
        <span className="text-sm font-medium text-[#2C2416]">Porciones:</span>
        <button
          onClick={() => setServings(Math.max(1, servings - 1))}
          disabled={servings <= 1}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E8E0D0] bg-[#F5F0EB] text-sm font-medium text-[#2C2416] transition-colors hover:bg-[#E8E0D0] disabled:opacity-40"
        >
          -
        </button>
        <span className="min-w-[2ch] text-center font-bold text-[#2C2416]">{servings}</span>
        <button
          onClick={() => setServings(Math.min(100, servings + 1))}
          disabled={servings >= 100}
          className="flex h-8 w-8 items-center justify-center rounded-full border border-[#E8E0D0] bg-[#F5F0EB] text-sm font-medium text-[#2C2416] transition-colors hover:bg-[#E8E0D0] disabled:opacity-40"
        >
          +
        </button>
        {servings !== baseServings && (
          <button
            onClick={() => setServings(baseServings)}
            className="text-xs text-[#9C8B7A] hover:text-[#2C2416]"
          >
            Restablecer
          </button>
        )}
      </div>

      <ul className="space-y-1.5">
        {ingredients.map((ing, i) => (
          <li key={i} className="text-sm text-[#4A3F35]">
            {ing.qty !== null && (
              <span className="font-medium">{formatQty(ing.qty * scale)}</span>
            )}
            {ing.unit && <span className="ml-1">{ing.unit}</span>}
            <span className="ml-1">{ing.name}</span>
            {ing.qty === null && <span className="ml-1 text-[#9C8B7A]">(al gusto)</span>}
            {ing.note && (
              <span className="ml-1 text-[#9C8B7A]">— {ing.note}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
