import Link from "next/link";
import { Package, Heart, Eye, Mail } from "lucide-react";
import { getAllProducts } from "@/lib/data/products";
import { isSupabaseConfigured } from "@/lib/supabase/is-configured";
import { createServiceClient } from "@/lib/supabase/server";

export const metadata = { title: "Admin Dashboard" };

export default async function AdminOverviewPage() {
  const products = await getAllProducts();
  const totalLikes = products.reduce((sum, p) => sum + p.likeCount, 0);
  const totalViews = products.reduce((sum, p) => sum + p.viewCount, 0);

  let subscriberCount = 0;
  if (isSupabaseConfigured()) {
    const supabase = createServiceClient();
    const { count } = await supabase
      .from("subscribers")
      .select("id", { count: "exact", head: true })
      .eq("unsubscribed", false);
    subscriberCount = count ?? 0;
  }

  const stats = [
    { label: "Live items", value: products.filter((p) => p.status === "available").length, icon: Package },
    { label: "Total likes", value: totalLikes, icon: Heart },
    { label: "Total views", value: totalViews, icon: Eye },
    { label: "Subscribers", value: subscriberCount, icon: Mail },
  ];

  return (
    <div>
      <h1 className="mb-6 font-display text-3xl">Welcome back</h1>

      <div className="grid grid-cols-2 gap-4 lg:grid-cols-4">
        {stats.map(({ label, value, icon: Icon }) => (
          <div key={label} className="rounded-2xl border border-line bg-cloud p-5">
            <Icon className="mb-2 h-5 w-5 text-pop" />
            <div className="text-2xl font-semibold">{value.toLocaleString()}</div>
            <div className="text-xs text-ink-soft">{label}</div>
          </div>
        ))}
      </div>

      <div className="mt-8 grid gap-4 sm:grid-cols-3">
        <Link href="/admin/items/new" className="rounded-2xl border border-line bg-cloud p-5 transition hover:border-pop">
          <p className="font-display text-lg">Add a new item</p>
          <p className="mt-1 text-sm text-ink-soft">Upload photos, set a price, mark it live.</p>
        </Link>
        <Link href="/admin/analytics" className="rounded-2xl border border-line bg-cloud p-5 transition hover:border-pop">
          <p className="font-display text-lg">See what&apos;s trending</p>
          <p className="mt-1 text-sm text-ink-soft">Top categories, most-liked, most-clicked.</p>
        </Link>
        <Link href="/admin/newsletter" className="rounded-2xl border border-line bg-cloud p-5 transition hover:border-pop">
          <p className="font-display text-lg">Send a newsletter</p>
          <p className="mt-1 text-sm text-ink-soft">Pick items, generate the email, send it.</p>
        </Link>
      </div>
    </div>
  );
}
