import { ItemForm } from "@/components/admin/item-form";

export const metadata = { title: "New Item" };

export default function NewItemPage() {
  return (
    <div className="max-w-2xl">
      <h1 className="mb-6 font-display text-3xl">Add a new item</h1>
      <p className="mb-6 text-sm text-ink-soft">
        Save the item first, then you&apos;ll be able to upload photos on its edit page.
      </p>
      <ItemForm />
    </div>
  );
}
