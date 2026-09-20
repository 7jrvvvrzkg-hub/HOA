"use client";

import { useEffect, useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import Image from "next/image";
import { GripVertical, Star, Trash2, Upload } from "lucide-react";
import { uploadProductImage, deleteProductImage, reorderProductImages } from "@/lib/data/admin-actions";
import type { ProductImage } from "@/lib/types";

/**
 * Drag to reorder; whichever image sits first becomes the product's primary
 * photo everywhere on the site (grid cards, quick view, product page hero).
 */
export function ImageManager({ productId, images }: { productId: string; images: ProductImage[] }) {
  const router = useRouter();
  const [items, setItems] = useState(images);
  const [pending, startTransition] = useTransition();
  const [message, setMessage] = useState<string | null>(null);
  const dragIndex = useRef<number | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  // The server component that renders this passes fresh `images` after a
  // router.refresh() (post-upload) or a navigation — sync local state so
  // a new upload shows up immediately instead of needing a manual reload.
  useEffect(() => {
    setItems(images);
  }, [images]);

  function persistOrder(next: ProductImage[]) {
    setItems(next);
    startTransition(async () => {
      const result = await reorderProductImages(productId, next.map((i) => i.id));
      if (!result.ok) setMessage(result.message ?? null);
    });
  }

  function handleDrop(targetIndex: number) {
    if (dragIndex.current === null || dragIndex.current === targetIndex) return;
    const next = [...items];
    const [moved] = next.splice(dragIndex.current, 1);
    next.splice(targetIndex, 0, moved);
    dragIndex.current = null;
    persistOrder(next);
  }

  function makeFirst(index: number) {
    if (index === 0) return;
    const next = [...items];
    const [moved] = next.splice(index, 1);
    next.unshift(moved);
    persistOrder(next);
  }

  async function handleDelete(imageId: string) {
    startTransition(async () => {
      const result = await deleteProductImage(imageId, productId);
      if (result.ok) setItems((prev) => prev.filter((i) => i.id !== imageId));
      else setMessage(result.message ?? null);
    });
  }

  async function handleUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const formData = new FormData();
    formData.set("file", file);
    startTransition(async () => {
      const result = await uploadProductImage(productId, formData);
      if (result.ok) {
        setMessage("Uploaded.");
        router.refresh();
      } else {
        setMessage(result.message ?? null);
      }
      if (fileInputRef.current) fileInputRef.current.value = "";
    });
  }

  return (
    <div>
      <p className="mb-2 text-xs font-semibold uppercase tracking-widest text-ink-soft">
        Photos — drag to reorder, first = primary photo
      </p>

      <div className="grid grid-cols-3 gap-3 sm:grid-cols-4">
        {items.map((img, index) => (
          <div
            key={img.id}
            draggable
            onDragStart={() => (dragIndex.current = index)}
            onDragOver={(e) => e.preventDefault()}
            onDrop={() => handleDrop(index)}
            className="group relative aspect-square cursor-grab overflow-hidden rounded-xl border border-line bg-cream-soft active:cursor-grabbing"
          >
            <Image src={img.url} alt="" fill className="object-cover" />
            {index === 0 && (
              <span className="absolute left-1.5 top-1.5 rounded-full bg-forest px-2 py-0.5 text-[0.6rem] font-semibold text-cream">
                Primary
              </span>
            )}
            <div className="absolute inset-x-0 bottom-0 flex items-center justify-between bg-ink/60 px-1.5 py-1 opacity-0 transition group-hover:opacity-100">
              <GripVertical className="h-3.5 w-3.5 text-cream/70" />
              <div className="flex gap-1">
                {index !== 0 && (
                  <button
                    type="button"
                    onClick={() => makeFirst(index)}
                    title="Make primary"
                    className="rounded-full bg-cream/90 p-1 text-ink"
                  >
                    <Star className="h-3 w-3" />
                  </button>
                )}
                <button
                  type="button"
                  onClick={() => handleDelete(img.id)}
                  title="Delete"
                  className="rounded-full bg-cream/90 p-1 text-pop-dark"
                >
                  <Trash2 className="h-3 w-3" />
                </button>
              </div>
            </div>
          </div>
        ))}

        <label className="flex aspect-square cursor-pointer flex-col items-center justify-center gap-1 rounded-xl border-2 border-dashed border-line text-ink-soft transition hover:border-pop hover:text-pop">
          <Upload className="h-5 w-5" />
          <span className="text-xs">Upload</span>
          <input ref={fileInputRef} type="file" accept="image/*" className="hidden" onChange={handleUpload} />
        </label>
      </div>

      {pending && <p className="mt-2 text-xs text-ink-soft">Saving…</p>}
      {message && <p className="mt-2 text-xs text-ink-soft">{message}</p>}
    </div>
  );
}
