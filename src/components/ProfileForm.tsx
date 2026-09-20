"use client";

import { useActionState, useRef, useState } from "react";
import { updateOwnProfile, type ProfileFormState } from "@/actions/profile";
import { Button } from "@/components/Button";
import { compressImageIfNeeded } from "@/lib/compressImage";

const MAX_AVATAR_BYTES = 4 * 1024 * 1024;

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
  const [avatarError, setAvatarError] = useState<string | null>(null);
  const [processingAvatar, setProcessingAvatar] = useState(false);
  const avatarInputRef = useRef<HTMLInputElement>(null);

  async function handleAvatarChange() {
    const input = avatarInputRef.current;
    const file = input?.files?.[0];
    setAvatarError(null);
    if (!input || !file) return;

    setProcessingAvatar(true);
    // A phone camera photo can easily be 15-25MB at full resolution — way
    // over what a small profile picture needs, and over Vercel's fixed
    // 4.5MB request-body ceiling too. Shrink it in the browser first, on
    // both mobile and desktop, so the upload actually goes through.
    const processed = await compressImageIfNeeded(file);
    setProcessingAvatar(false);

    if (processed.size > MAX_AVATAR_BYTES) {
      setAvatarError(
        `That photo is ${(processed.size / (1024 * 1024)).toFixed(1)}MB even after shrinking — try a different one.`
      );
      return;
    }

    if (processed !== file) {
      const dt = new DataTransfer();
      dt.items.add(processed);
      input.files = dt.files;
    }
  }

  return (
    <form action={formAction} className="mt-6 max-w-xl space-y-5">
      <div className="flex flex-wrap items-center gap-4">
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
          <input
            ref={avatarInputRef}
            name="avatar"
            type="file"
            accept="image/*"
            onChange={handleAvatarChange}
            className="mt-1 text-sm"
          />
          {processingAvatar && <p className="mt-1 text-xs text-ink-soft">Preparing photo…</p>}
          {avatarError && <p className="mt-1 text-xs text-danger">{avatarError}</p>}
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

      <Button type="submit" disabled={pending || processingAvatar || !!avatarError}>
        {pending ? "Saving..." : "Save Changes"}
      </Button>
    </form>
  );
}
