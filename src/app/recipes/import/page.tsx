import { ImportRecipe } from '@/components/recipe/import-recipe';

export default function ImportRecipePage() {
  return (
    <div>
      <h1 className="mb-2 text-2xl font-bold">Importar Receta</h1>
      <p className="mb-6 text-sm text-[#9C8B7A]">
        Sube una foto, pega un enlace o copia el texto de una receta para importarla.
      </p>
      <ImportRecipe />
    </div>
  );
}
