"use client";

import { useActionState } from "react";
import { createUserProfile, type CreateUserFormState } from "@/actions/users";
import { Button } from "@/components/Button";

const initialState: CreateUserFormState = { ok: false };

export default function CreateUserForm() {
  const [state, formAction, pending] = useActionState(createUserProfile, initialState);

  return (
    <form action={formAction} className="grid gap-4 rounded-lg border border-cream-dark bg-white p-5 sm:grid-cols-2">
      <div>
        <label className="block text-sm font-medium text-ink">place holder (full name label)</label>
        <input name="fullName" required className="mt-1 w-full rounded-md border border-cream-dark px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium text-ink">place holder (email label)</label>
        <input name="email" type="email" required className="mt-1 w-full rounded-md border border-cream-dark px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium text-ink">place holder (temporary password label)</label>
        <input name="password" type="text" required minLength={8} className="mt-1 w-full rounded-md border border-cream-dark px-3 py-2 text-sm" />
      </div>
      <div>
        <label className="block text-sm font-medium text-ink">place holder (unit label, optional)</label>
        <input name="unit" className="mt-1 w-full rounded-md border border-cream-dark px-3 py-2 text-sm" />
      </div>
      <fieldset className="sm:col-span-2">
        <legend className="text-sm font-medium text-ink">place holder (roles label)</legend>
        <div className="mt-1 flex gap-4 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="roles" value="ADMIN" /> admin
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="roles" value="OWNER" defaultChecked /> owner
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="roles" value="RENTER" /> renter
          </label>
        </div>
      </fieldset>

      {state.error && <p className="text-sm text-danger sm:col-span-2">{state.error}</p>}
      {state.ok && <p className="text-sm text-primary sm:col-span-2">place holder (profile created confirmation copy)</p>}

      <div className="sm:col-span-2">
        <Button type="submit" disabled={pending}>
          {pending ? "place holder (creating label)" : "place holder (create profile button label)"}
        </Button>
      </div>
    </form>
  );
}
