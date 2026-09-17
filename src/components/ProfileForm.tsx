"use client";

import { useActionState } from "react";
import { updateOwnProfile, type ProfileFormState } from "@/actions/profile";
import { Button } from "@/components/Button";

type Props = {
  fullName: string;
  unit: string;
  address: string;
  phone: string;
  contactEmail: string;
  shareUnit: boolean;
  sharePhone: boolean;
  shareContactEmail: boolean;
};

const initialState: ProfileFormState = { ok: false };

export default function ProfileForm(props: Props) {
  const [state, formAction, pending] = useActionState(updateOwnProfile, initialState);

  return (
    <form action={formAction} className="mt-6 max-w-xl space-y-5">
      <div>
        <label className="block text-sm font-medium text-ink">place holder (full name label)</label>
        <input
          name="fullName"
          defaultValue={props.fullName}
          required
          className="mt-1 w-full rounded-md border border-cream-dark px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-ink">place holder (unit / address line label)</label>
          <input
            name="unit"
            defaultValue={props.unit}
            className="mt-1 w-full rounded-md border border-cream-dark px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink">place holder (mailing address label)</label>
          <input
            name="address"
            defaultValue={props.address}
            className="mt-1 w-full rounded-md border border-cream-dark px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-ink">place holder (phone label)</label>
          <input
            name="phone"
            defaultValue={props.phone}
            className="mt-1 w-full rounded-md border border-cream-dark px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink">place holder (display email label)</label>
          <input
            name="contactEmail"
            type="email"
            defaultValue={props.contactEmail}
            className="mt-1 w-full rounded-md border border-cream-dark px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      <fieldset className="rounded-md border border-cream-dark p-4">
        <legend className="px-1 text-sm font-medium text-ink">
          place holder (directory sharing heading — choose what other residents can see)
        </legend>
        <div className="mt-2 space-y-2 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="shareUnit" defaultChecked={props.shareUnit} />
            place holder (share unit/address toggle label)
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="sharePhone" defaultChecked={props.sharePhone} />
            place holder (share phone toggle label)
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="shareContactEmail" defaultChecked={props.shareContactEmail} />
            place holder (share email toggle label)
          </label>
        </div>
      </fieldset>

      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      {state.ok && <p className="text-sm text-primary">place holder (profile saved confirmation copy)</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "place holder (saving label)" : "place holder (save changes button label)"}
      </Button>
    </form>
  );
}
