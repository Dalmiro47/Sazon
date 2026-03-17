'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Trash2 } from 'lucide-react';
import {
  MobileDialog,
  MobileDialogContent,
  MobileDialogHeader,
  MobileDialogTitle,
} from '@/components/ui/mobile-dialog';
import { deleteRecipeAction } from '@/app/actions/recipe';

interface DeleteRecipeButtonProps {
  recipeId: string;
  recipeName: string;
}

export function DeleteRecipeButton({ recipeId, recipeName }: DeleteRecipeButtonProps) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [deleting, setDeleting] = useState(false);

  async function handleDelete() {
    setDeleting(true);

    const result = await deleteRecipeAction(recipeId);

    if (result.ok) {
      toast.success('Receta eliminada');
      router.push('/');
      router.refresh();
    } else {
      toast.error(result.message);
    }

    setDeleting(false);
    setOpen(false);
  }

  return (
    <>
      <button
        onClick={() => setOpen(true)}
        className="flex items-center gap-1.5 rounded-full px-4 py-2 text-sm text-red-500 transition-colors hover:bg-red-50"
      >
        <Trash2 size={14} />
        Eliminar
      </button>

      <MobileDialog open={open} onOpenChange={setOpen}>
        <MobileDialogContent position="center">
          <MobileDialogHeader>
            <MobileDialogTitle>¿Eliminar receta?</MobileDialogTitle>
            <p className="mt-2 text-sm text-[#9C8B7A]">
              ¿Estás seguro de que quieres eliminar &quot;{recipeName}&quot;? La receta dejará de aparecer pero la información no se perderá.
            </p>
          </MobileDialogHeader>
          <div className="flex gap-2 px-5 pb-5">
            <button
              onClick={() => setOpen(false)}
              disabled={deleting}
              className="flex-1 rounded-full border border-[#E8E0D0] bg-[#F5F0EB] py-2.5 text-sm font-semibold text-[#2C2416] transition-colors hover:bg-[#E8E0D0] disabled:opacity-60"
            >
              Cancelar
            </button>
            <button
              onClick={handleDelete}
              disabled={deleting}
              className="flex-1 rounded-full bg-red-500 py-2.5 text-sm font-bold text-white transition-colors hover:bg-red-600 disabled:opacity-60"
            >
              {deleting ? 'Eliminando...' : 'Eliminar'}
            </button>
          </div>
        </MobileDialogContent>
      </MobileDialog>
    </>
  );
}
