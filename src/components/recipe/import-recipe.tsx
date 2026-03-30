'use client';

import { useState, useRef } from 'react';
import { useRouter } from 'next/navigation';
import { toast } from 'sonner';
import { Camera, Link2, FileText, Clipboard, ImageIcon, Upload } from 'lucide-react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import {
  importFromImageAction,
  importFromUrlAction,
  importFromTextAction,
} from '@/app/actions/import-recipe';
import type { RecipePayload } from '@/types/recipe';

const inputCls =
  'w-full rounded-xl border border-[#E8E0D0] bg-[#F5F0EB] px-3 py-2.5 text-sm text-[#2C2416] outline-none placeholder:text-[#9C8B7A] focus:ring-2 focus:ring-[#5C7A3E]/40';

const btnCls =
  'w-full rounded-full bg-[#5C7A3E] py-2.5 text-sm font-bold text-white transition-colors hover:bg-[#4a6433] disabled:opacity-60';

const largeBtnCls =
  'flex items-center justify-center gap-3 rounded-xl border border-[#E8E0D0] bg-[#F5F0EB] py-4 text-[#2C2416] font-semibold transition-colors hover:bg-[#E8E0D0]';

interface ImportRecipeProps {
  onImported?: () => void;
}

export function ImportRecipe({ onImported }: ImportRecipeProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);

  const [loading, setLoading] = useState(false);
  const [isDragOver, setIsDragOver] = useState(false);

  // Photo state
  const [imagePreview, setImagePreview] = useState<string | null>(null);
  const [imageBase64, setImageBase64] = useState<string | null>(null);

  // Link state
  const [url, setUrl] = useState('');

  // Text state
  const [text, setText] = useState('');

  function loadImageFile(file: File) {
    if (file.size > 4 * 1024 * 1024) {
      toast.error('La imagen es demasiado grande (máximo 4MB)');
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = reader.result as string;
      setImagePreview(dataUrl);
      setImageBase64(dataUrl.split(',')[1]);
    };
    reader.readAsDataURL(file);
  }

  function handleFileChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (file) loadImageFile(file);
  }

  function handlePasteEvent(e: React.ClipboardEvent<HTMLDivElement>) {
    const item = Array.from(e.clipboardData.items).find((i) => i.type.startsWith('image/'));
    if (!item) return;
    const file = item.getAsFile();
    if (file) loadImageFile(file);
  }

  function handleDragEnter(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(true);
  }

  function handleDragLeave(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
  }

  function handleDragOver(e: React.DragEvent) {
    e.preventDefault();
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    setIsDragOver(false);
    const file = e.dataTransfer.files?.[0];
    if (file?.type.startsWith('image/')) {
      loadImageFile(file);
    }
  }

  async function handlePasteFromClipboard() {
    try {
      const items = await navigator.clipboard.read();
      for (const item of items) {
        const imageType = item.types.find((t) => t.startsWith('image/'));
        if (imageType) {
          const blob = await item.getType(imageType);
          loadImageFile(new File([blob], 'screenshot.png', { type: imageType }));
          return;
        }
      }
      toast.error('No hay ninguna imagen en el portapapeles');
    } catch {
      toast.error('No se pudo acceder al portapapeles. Usá el botón de seleccionar archivo.');
    }
  }

  async function handleImportImage() {
    if (!imageBase64) {
      toast.error('Selecciona una imagen primero');
      return;
    }
    setLoading(true);
    const result = await importFromImageAction(imageBase64);
    setLoading(false);

    if (result.ok) {
      handleSuccess(result.recipe);
    } else {
      toast.error(result.message);
    }
  }

  async function handleImportUrl() {
    if (!url.trim()) {
      toast.error('Ingresa un enlace');
      return;
    }
    setLoading(true);
    const result = await importFromUrlAction(url.trim());
    setLoading(false);

    if (result.ok) {
      handleSuccess(result.recipe);
    } else {
      toast.error(result.message);
    }
  }

  async function handleImportText() {
    if (!text.trim()) {
      toast.error('Pega el texto de la receta');
      return;
    }
    setLoading(true);
    const result = await importFromTextAction(text.trim());
    setLoading(false);

    if (result.ok) {
      handleSuccess(result.recipe);
    } else {
      toast.error(result.message);
    }
  }

  function handleSuccess(recipe: RecipePayload) {
    localStorage.setItem('import-recipe-draft', JSON.stringify(recipe));
    if (onImported) {
      onImported();
    } else {
      router.push('/recipes/new');
    }
  }

  return (
    <Tabs defaultValue="photo" className="w-full">
      <TabsList className="mb-4 grid w-full grid-cols-3 rounded-xl bg-[#E8E0D0]">
        <TabsTrigger
          value="photo"
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg text-sm data-[state=active]:bg-white data-[state=active]:text-[#2C2416]"
        >
          <Camera size={16} />
          Foto
        </TabsTrigger>
        <TabsTrigger
          value="link"
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg text-sm data-[state=active]:bg-white data-[state=active]:text-[#2C2416]"
        >
          <Link2 size={16} />
          Enlace
        </TabsTrigger>
        <TabsTrigger
          value="text"
          disabled={loading}
          className="flex items-center gap-1.5 rounded-lg text-sm data-[state=active]:bg-white data-[state=active]:text-[#2C2416]"
        >
          <FileText size={16} />
          Texto
        </TabsTrigger>
      </TabsList>

      {/* Photo tab */}
      <TabsContent value="photo" className="space-y-3">
        {/* Mobile UI — single button (system picker includes camera + gallery) */}
        {!imagePreview && (
          <div className="flex flex-col gap-3 md:hidden">
            <button
              type="button"
              onClick={() => fileRef.current?.click()}
              className={largeBtnCls}
            >
              <ImageIcon size={20} />
              Seleccionar foto
            </button>
          </div>
        )}

        {/* Desktop UI — drop zone */}
        {!imagePreview && (
          <div
            onPaste={handlePasteEvent}
            onClick={() => fileRef.current?.click()}
            onDragEnter={handleDragEnter}
            onDragLeave={handleDragLeave}
            onDragOver={handleDragOver}
            onDrop={handleDrop}
            className={`hidden md:flex flex-col items-center justify-center gap-2 rounded-xl border-2 border-dashed p-8 cursor-pointer transition-colors ${
              isDragOver
                ? 'border-[#5C7A3E] bg-[#5C7A3E]/10'
                : 'border-[#E8E0D0] bg-[#F5F0EB] hover:border-[#5C7A3E]/40'
            }`}
          >
            <Upload size={32} className="text-[#9C8B7A]" />
            <p className="text-sm text-[#9C8B7A]">Arrastrá una foto aquí</p>
            <p className="text-xs text-[#9C8B7A]">o hacé clic para seleccionar</p>
          </div>
        )}

        {/* Image preview — both desktop and mobile */}
        {imagePreview && (
          /* eslint-disable-next-line @next/next/no-img-element */
          <img
            src={imagePreview}
            alt="Vista previa"
            className="w-full max-h-64 rounded-xl object-contain"
          />
        )}

        {/* Paste from clipboard button — works on both mobile and desktop */}
        {!imagePreview && (
          <button
            type="button"
            onClick={handlePasteFromClipboard}
            className="flex w-full items-center justify-center gap-2 rounded-xl border border-[#E8E0D0] bg-[#F5F0EB] py-2.5 text-sm font-semibold text-[#2C2416] transition-colors hover:bg-[#E8E0D0]"
          >
            <Clipboard size={16} className="text-[#5C7A3E]" />
            Pegar captura de pantalla
          </button>
        )}

        {/* File input — hidden */}
        <input
          ref={fileRef}
          type="file"
          accept="image/*"
          onChange={handleFileChange}
          className="hidden"
        />

        {/* Change image button */}
        {imagePreview && (
          <button
            type="button"
            onClick={() => {
              setImagePreview(null);
              setImageBase64(null);
              if (fileRef.current) fileRef.current.value = '';
            }}
            className="text-sm text-[#9C8B7A] underline"
          >
            Cambiar imagen
          </button>
        )}

        {/* Extract button */}
        <button onClick={handleImportImage} disabled={loading || !imageBase64} className={btnCls}>
          {loading ? 'Extrayendo...' : 'Extraer receta'}
        </button>
      </TabsContent>

      {/* Link tab */}
      <TabsContent value="link" className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-semibold text-[#2C2416]">
            Enlace de la receta
          </label>
          <input
            type="url"
            value={url}
            onChange={(e) => setUrl(e.target.value)}
            placeholder="https://..."
            className={inputCls}
            onKeyDown={(e) => {
              if (e.key === 'Enter') {
                e.preventDefault();
                handleImportUrl();
              }
            }}
          />
        </div>
        <button onClick={handleImportUrl} disabled={loading || !url.trim()} className={btnCls}>
          {loading ? 'Extrayendo...' : 'Extraer receta'}
        </button>
      </TabsContent>

      {/* Text tab */}
      <TabsContent value="text" className="space-y-4">
        <div>
          <label className="mb-1 block text-sm font-semibold text-[#2C2416]">
            Texto de la receta
          </label>
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Pega aquí el texto de la receta..."
            rows={8}
            className={inputCls}
          />
          <p className="mt-1 text-xs text-[#9C8B7A]">
            {text.length.toLocaleString()} / 10,000 caracteres
          </p>
        </div>
        <button onClick={handleImportText} disabled={loading || !text.trim()} className={btnCls}>
          {loading ? 'Extrayendo...' : 'Extraer receta'}
        </button>
      </TabsContent>
    </Tabs>
  );
}
