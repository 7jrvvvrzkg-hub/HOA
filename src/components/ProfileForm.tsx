"use client";

import { useActionState } from "react";
import { updateOwnProfile, type ProfileFormState } from "@/actions/profile";
import { Button } from "@/components/Button";

type Props = {
  profileId: string;
  hasAvatar: boolean;
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
      <div className="flex items-center gap-4">
        {props.hasAvatar ? (
          // eslint-disable-next-line @next/next/no-img-element -- served from our own DB-backed route, not an optimizable static asset
          <img
            src={`/portal/avatars/${props.profileId}`}
            alt=""
            className="h-16 w-16 rounded-full border border-cream-dark object-cover"
          />
        ) : (
          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-cream-dark bg-cream-dark/40 text-xs text-ink-soft">
            no photo
          </div>
        )}
        <div>
          <label className="block text-sm font-medium text-ink">Profile Picture</label>
          <input name="avatar" type="file" accept="image/*" className="mt-1 text-sm" />
        </div>
      </div>

      <div>
        <label className="block text-sm font-medium text-ink">Full Name</label>
        <input
          name="fullName"
          defaultValue={props.fullName}
          required
          className="mt-1 w-full rounded-md border border-cream-dark px-3 py-2 text-sm focus:border-primary focus:outline-none"
        />
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-ink">Unit</label>
          <input
            name="unit"
            defaultValue={props.unit}
            className="mt-1 w-full rounded-md border border-cream-dark px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink">Mailing Address</label>
          <input
            name="address"
            defaultValue={props.address}
            className="mt-1 w-full rounded-md border border-cream-dark px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </div>
      </div>

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="block text-sm font-medium text-ink">Phone</label>
          <input
            name="phone"
            defaultValue={props.phone}
            className="mt-1 w-full rounded-md border border-cream-dark px-3 py-2 text-sm focus:border-primary focus:outline-none"
          />
        </div>
        <div>
          <label className="block text-sm font-medium text-ink">Contact Email</label>
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
          Directory Sharing — choose what other residents can see
        </legend>
        <div className="mt-2 space-y-2 text-sm">
          <label className="flex items-center gap-2">
            <input type="checkbox" name="shareUnit" defaultChecked={props.shareUnit} />
            Share my unit in the directory
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="sharePhone" defaultChecked={props.sharePhone} />
            Share my phone in the directory
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" name="shareContactEmail" defaultChecked={props.shareContactEmail} />
            Share my email in the directory
          </label>
        </div>
      </fieldset>

      {state.error && <p className="text-sm text-danger">{state.error}</p>}
      {state.ok && <p className="text-sm text-primary">Profile saved.</p>}

      <Button type="submit" disabled={pending}>
        {pending ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}
