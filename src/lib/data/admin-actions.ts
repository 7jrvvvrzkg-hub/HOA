"use server";

import { revalidatePath } from "next/cache";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createServiceClient } from "@/lib/supabase/server";
import { slugify } from "@/lib/format";
import {
  demoInsert,
  demoUpdate,
  demoSetStatus,
  demoDelete,
  demoAddImage,
  demoDeleteImage,
  demoReorderImages,
} from "@/lib/data/demo-store";
import type { Category } from "@/lib/types";

type ActionResult = { ok: boolean; message?: string };

const DEMO_SAVED: ActionResult = {
  ok: true,
  message: "Saved to this preview session — connect Supabase (see the README) to make changes permanent.",
};

function revalidateShop() {
  revalidatePath("/");
  revalidatePath("/shop");
  revalidatePath("/admin/items");
}

export async function createProduct(formData: FormData): Promise<ActionResult> {
  const name = String(formData.get("name") ?? "").trim();
  const category = String(formData.get("category") ?? "") as Category;
  const priceCents = Math.round(parseFloat(String(formData.get("price") ?? "0")) * 100) || 0;
  if (!name || !category) return { ok: false, message: "Name and category are required." };

  const fields = {
    name,
    description: String(formData.get("description") ?? ""),
    priceCents,
    category,
    era: String(formData.get("era") ?? "") || undefined,
    materials: String(formData.get("materials") ?? "") || undefined,
    dimensions: String(formData.get("dimensions") ?? "") || undefined,
    condition: String(formData.get("condition") ?? "") || undefined,
    isNewArrival: formData.get("isNewArrival") === "on",
  };

  if (!isSupabaseConfigured()) {
    demoInsert(fields);
    revalidateShop();
    return DEMO_SAVED;
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from("products").insert({
    slug: `${slugify(name)}-${Date.now().toString(36)}`,
    name,
    description: fields.description,
    price_cents: priceCents,
    category,
    era: fields.era ?? null,
    materials: fields.materials ?? null,
    dimensions: fields.dimensions ?? null,
    condition: fields.condition ?? null,
    status: "available",
    is_new_arrival: fields.isNewArrival,
  });

  if (error) return { ok: false, message: error.message };
  revalidateShop();
  return { ok: true };
}

export async function updateProduct(id: string, formData: FormData): Promise<ActionResult> {
  const priceCents = Math.round(parseFloat(String(formData.get("price") ?? "0")) * 100) || 0;
  const fields = {
    name: String(formData.get("name") ?? ""),
    description: String(formData.get("description") ?? ""),
    priceCents,
    category: String(formData.get("category") ?? "") as Category,
    era: String(formData.get("era") ?? "") || undefined,
    materials: String(formData.get("materials") ?? "") || undefined,
    dimensions: String(formData.get("dimensions") ?? "") || undefined,
    condition: String(formData.get("condition") ?? "") || undefined,
    isNewArrival: formData.get("isNewArrival") === "on",
  };

  if (!isSupabaseConfigured()) {
    const found = demoUpdate(id, fields);
    if (!found) return { ok: false, message: "Item not found in this preview session." };
    revalidateShop();
    revalidatePath(`/admin/items/${id}`);
    return DEMO_SAVED;
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("products")
    .update({
      name: fields.name,
      description: fields.description,
      price_cents: priceCents,
      category: fields.category,
      era: fields.era ?? null,
      materials: fields.materials ?? null,
      dimensions: fields.dimensions ?? null,
      condition: fields.condition ?? null,
      is_new_arrival: fields.isNewArrival,
    })
    .eq("id", id);

  if (error) return { ok: false, message: error.message };
  revalidateShop();
  revalidatePath(`/admin/items/${id}`);
  return { ok: true };
}

export async function setProductStatus(
  id: string,
  status: "available" | "sold" | "draft"
): Promise<ActionResult> {
  if (!isSupabaseConfigured()) {
    demoSetStatus(id, status);
    revalidateShop();
    revalidatePath("/sold-archive");
    return DEMO_SAVED;
  }

  const supabase = createServiceClient();
  const { error } = await supabase
    .from("products")
    .update({ status, sold_at: status === "sold" ? new Date().toISOString() : null })
    .eq("id", id);

  if (error) return { ok: false, message: error.message };
  revalidateShop();
  revalidatePath("/sold-archive");
  return { ok: true };
}

export async function deleteProduct(id: string): Promise<ActionResult> {
  if (!isSupabaseConfigured()) {
    demoDelete(id);
    revalidateShop();
    return DEMO_SAVED;
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from("products").delete().eq("id", id);
  if (error) return { ok: false, message: error.message };
  revalidateShop();
  return { ok: true };
}

async function fileToDataUrl(file: File): Promise<string> {
  const buffer = Buffer.from(await file.arrayBuffer());
  return `data:${file.type || "image/jpeg"};base64,${buffer.toString("base64")}`;
}

export async function uploadProductImage(productId: string, formData: FormData): Promise<ActionResult> {
  const file = formData.get("file") as File | null;
  if (!file || file.size === 0) return { ok: false, message: "Choose an image first." };

  if (!isSupabaseConfigured()) {
    // No Supabase Storage yet — embed the photo directly as a data URL in
    // this preview session's in-memory store. Real uploads (and durable
    // storage) start working the moment Supabase is connected.
    if (file.size > 4_500_000) {
      return { ok: false, message: "That image is a bit large for the preview session — try one under ~4MB, or connect Supabase for real uploads." };
    }
    const dataUrl = await fileToDataUrl(file);
    const image = demoAddImage(productId, dataUrl);
    if (!image) return { ok: false, message: "Item not found in this preview session." };
    revalidateShop();
    revalidatePath(`/admin/items/${productId}`);
    return DEMO_SAVED;
  }

  const supabase = createServiceClient();
  const path = `${productId}/${Date.now()}-${file.name.replace(/[^a-zA-Z0-9._-]/g, "")}`;

  const { error: uploadError } = await supabase.storage
    .from("product-images")
    .upload(path, file, { contentType: file.type });
  if (uploadError) return { ok: false, message: uploadError.message };

  const { data: publicUrl } = supabase.storage.from("product-images").getPublicUrl(path);

  const { count } = await supabase
    .from("product_images")
    .select("id", { count: "exact", head: true })
    .eq("product_id", productId);

  const { error: insertError } = await supabase
    .from("product_images")
    .insert({ product_id: productId, url: publicUrl.publicUrl, position: count ?? 0 });
  if (insertError) return { ok: false, message: insertError.message };

  revalidateShop();
  revalidatePath(`/admin/items/${productId}`);
  return { ok: true };
}

export async function deleteProductImage(imageId: string, productId: string): Promise<ActionResult> {
  if (!isSupabaseConfigured()) {
    demoDeleteImage(imageId);
    revalidateShop();
    revalidatePath(`/admin/items/${productId}`);
    return DEMO_SAVED;
  }

  const supabase = createServiceClient();
  const { error } = await supabase.from("product_images").delete().eq("id", imageId);
  if (error) return { ok: false, message: error.message };
  revalidateShop();
  revalidatePath(`/admin/items/${productId}`);
  return { ok: true };
}

// Called after a drag-reorder on the admin item page — `orderedIds` is the
// full list of that product's image ids in their new order; position 0
// becomes the primary/first image shown everywhere on the site.
export async function reorderProductImages(productId: string, orderedIds: string[]): Promise<ActionResult> {
  if (!isSupabaseConfigured()) {
    demoReorderImages(productId, orderedIds);
    revalidateShop();
    revalidatePath(`/admin/items/${productId}`);
    return DEMO_SAVED;
  }

  const supabase = createServiceClient();

  await Promise.all(
    orderedIds.map((id, index) => supabase.from("product_images").update({ position: index }).eq("id", id))
  );

  revalidateShop();
  revalidatePath(`/admin/items/${productId}`);
  return { ok: true };
}
