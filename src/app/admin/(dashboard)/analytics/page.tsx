import { BarList } from "@/components/admin/bar-list";
import { CategoryDonut } from "@/components/admin/category-donut";
import { getAnalyticsSummary } from "@/lib/data/analytics";

export const metadata = { title: "Analytics" };

export default async function AdminAnalyticsPage() {
  const summary = await getAnalyticsSummary();

  return (
    <div>
      <h1 className="mb-6 font-display text-3xl">Analytics</h1>

      <div className="grid gap-6 lg:grid-cols-2">
        <div className="rounded-2xl border border-line bg-cloud p-5">
          <h2 className="mb-4 font-display text-lg">Category share of views</h2>
          <CategoryDonut items={summary.topCategories} />
        </div>

        <div className="rounded-2xl border border-line bg-cloud p-5">
          <h2 className="mb-4 font-display text-lg">Most-loved &amp; most-clicked items</h2>
          <BarList
            items={summary.topProducts.map((p) => ({ label: p.name, value: p.clicks + p.likes }))}
            color="var(--color-pop)"
            emptyLabel="No likes or clicks logged yet — browse the shop and like a few pieces to see this fill in."
          />
        </div>
      </div>

      <div className="mt-6 rounded-2xl border border-line bg-cloud p-5">
        <h2 className="mb-4 font-display text-lg">Most-viewed categories</h2>
        <BarList
          items={summary.topCategories.map((c) => ({ label: c.category, value: c.views }))}
          color="var(--color-forest)"
          emptyLabel="No category views logged yet."
        />
      </div>

      <div className="mt-6 grid grid-cols-3 gap-4">
        <div className="rounded-2xl border border-line bg-cloud p-5 text-center">
          <div className="text-2xl font-semibold">{summary.totalLikes}</div>
          <div className="text-xs text-ink-soft">Total likes</div>
        </div>
        <div className="rounded-2xl border border-line bg-cloud p-5 text-center">
          <div className="text-2xl font-semibold">{summary.totalViews}</div>
          <div className="text-xs text-ink-soft">Total product views</div>
        </div>
        <div className="rounded-2xl border border-line bg-cloud p-5 text-center">
          <div className="text-2xl font-semibold">{summary.totalSubscribers}</div>
          <div className="text-xs text-ink-soft">Newsletter subscribers</div>
        </div>
      </div>
    </div>
  );
}
