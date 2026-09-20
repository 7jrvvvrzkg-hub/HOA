"use server";

import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createClient } from "@/lib/supabase/server";

export async function loginAction(formData: FormData): Promise<{ error?: string }> {
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");

  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });
    if (error) return { error: "Incorrect email or password." };
    redirect("/admin");
  }

  // Demo mode: a single shared password, since there's no real Supabase
  // Auth user yet. Set ADMIN_DEMO_PASSWORD in .env.local — this is NOT a
  // substitute for real auth and shouldn't be relied on past setup.
  const demoPassword = process.env.ADMIN_DEMO_PASSWORD ?? "embellish-demo";
  if (password !== demoPassword) {
    return { error: "Incorrect password." };
  }

  const cookieStore = await cookies();
  cookieStore.set("embellish_demo_admin", "1", {
    httpOnly: true,
    sameSite: "lax",
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: 60 * 60 * 8,
  });
  redirect("/admin");
}

export async function logoutAction() {
  if (isSupabaseConfigured()) {
    const supabase = await createClient();
    await supabase.auth.signOut();
  }
  const cookieStore = await cookies();
  cookieStore.delete("embellish_demo_admin");
  redirect("/admin/login");
}
