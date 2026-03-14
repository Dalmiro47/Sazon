'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from '@/components/ui/dialog';
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
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button
          variant="ghost"
          size="sm"
          className="text-destructive hover:bg-destructive/10 hover:text-destructive"
        >
          Eliminar
        </Button>
      </DialogTrigger>
      <DialogContent>
        <DialogHeader>
          <DialogTitle>¿Eliminar receta?</DialogTitle>
          <DialogDescription>
            ¿Estás seguro de que quieres eliminar &quot;{recipeName}&quot;? La receta dejará de aparecer pero la información no se perderá.
          </DialogDescription>
        </DialogHeader>
        <DialogFooter>
          <Button variant="outline" onClick={() => setOpen(false)} disabled={deleting}>
            Cancelar
          </Button>
          <Button variant="destructive" onClick={handleDelete} disabled={deleting}>
            {deleting ? 'Eliminando...' : 'Eliminar'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
