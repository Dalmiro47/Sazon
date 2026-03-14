'use client';

import { useState } from 'react';
import { Button } from '@/components/ui/button';
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
        <span className="text-sm font-medium">Porciones:</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setServings(Math.max(1, servings - 1))}
          disabled={servings <= 1}
        >
          -
        </Button>
        <span className="min-w-[2ch] text-center font-bold">{servings}</span>
        <Button
          variant="outline"
          size="sm"
          onClick={() => setServings(Math.min(100, servings + 1))}
          disabled={servings >= 100}
        >
          +
        </Button>
        {servings !== baseServings && (
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setServings(baseServings)}
            className="text-xs text-muted-foreground"
          >
            Restablecer
          </Button>
        )}
      </div>

      <ul className="space-y-1">
        {ingredients.map((ing, i) => (
          <li key={i} className="text-sm">
            {ing.qty !== null && (
              <span className="font-medium">{formatQty(ing.qty * scale)}</span>
            )}
            {ing.unit && <span className="ml-1">{ing.unit}</span>}
            <span className="ml-1">{ing.name}</span>
            {ing.qty === null && <span className="ml-1 text-muted-foreground">(al gusto)</span>}
            {ing.note && (
              <span className="ml-1 text-muted-foreground">— {ing.note}</span>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
