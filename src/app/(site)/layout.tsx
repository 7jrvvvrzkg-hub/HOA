import { SiteHeader } from "@/components/site-header";
import { SiteFooter } from "@/components/site-footer";
import { CartDrawer } from "@/components/cart-drawer";
import { searchProductNames } from "@/lib/data/products";

// A separate layout (not a separate root layout — it still nests inside
// app/layout.tsx for html/body/fonts) just for the customer-facing shop, so
// /admin can have its own minimal shell instead of inheriting the shop's
// top bar, search, and footer.
export default async function SiteLayout({ children }: { children: React.ReactNode }) {
  const searchWords = await searchProductNames(30);

  return (
    <>
      <SiteHeader searchWords={searchWords} />
      <main className="flex-1">{children}</main>
      <SiteFooter />
      <CartDrawer />
    </>
  );
}
