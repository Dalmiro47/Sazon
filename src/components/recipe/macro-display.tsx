interface MacroDisplayProps {
  calories_per_serving: number | null;
  protein_per_serving: number | null;
  fat_per_serving: number | null;
  carbs_per_serving: number | null;
}

export function MacroDisplay({
  calories_per_serving,
  protein_per_serving,
  fat_per_serving,
  carbs_per_serving,
}: MacroDisplayProps) {
  const hasAny =
    calories_per_serving !== null ||
    protein_per_serving !== null ||
    fat_per_serving !== null ||
    carbs_per_serving !== null;

  if (!hasAny) return null;

  const items = [
    { label: 'Calorías', value: calories_per_serving, unit: '' },
    { label: 'Proteína', value: protein_per_serving, unit: 'g' },
    { label: 'Grasa', value: fat_per_serving, unit: 'g' },
    { label: 'Carbos', value: carbs_per_serving, unit: 'g' },
  ];

  return (
    <div className="flex flex-wrap gap-3">
      {items.map(
        (item) =>
          item.value !== null && (
            <div
              key={item.label}
              className="rounded-md border px-3 py-1.5 text-sm"
            >
              <span className="text-muted-foreground">{item.label}: </span>
              <span className="font-medium">
                {item.value}
                {item.unit}
              </span>
            </div>
          )
      )}
    </div>
  );
}
