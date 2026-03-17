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
    <div className="flex flex-wrap gap-2">
      {items.map(
        (item) =>
          item.value !== null && (
            <span
              key={item.label}
              className="rounded-full bg-[#F0EAD6] px-3 py-0.5 text-xs font-medium text-[#5C7A3E]"
            >
              {item.label}: {item.value}{item.unit}
            </span>
          )
      )}
    </div>
  );
}
