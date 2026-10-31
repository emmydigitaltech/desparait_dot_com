// Profile completion = 50% from profile fields + 50% from being a verified seller.
// To sell, completion must be ABOVE 80% (so: verified + at least 3 of the 4 profile fields).

export const PROFILE_STEPS = [
  { key: "full_name", label: "Add your full name" },
  { key: "avatar_url", label: "Add a profile photo" },
  { key: "phone", label: "Add your phone number" },
  { key: "campus", label: "Select your campus" },
] as const;

export const PROFILE_WEIGHT = 50;
export const VERIFIED_WEIGHT = 50;
export const MIN_TO_SELL = 80; // must be above this

type ProfileLike =
  | {
      full_name?: string | null;
      avatar_url?: string | null;
      phone?: string | null;
      campus?: string | null;
      is_verified?: boolean | null;
    }
  | null
  | undefined;

export type MissingItem = { key: string; label: string; points: number };

export function getCompletion(profile: ProfileLike) {
  const each = PROFILE_WEIGHT / PROFILE_STEPS.length;
  const missing: MissingItem[] = [];
  let raw = 0;

  for (const s of PROFILE_STEPS) {
    const v = profile?.[s.key];
    if (typeof v === "string" ? v.trim() !== "" : !!v) raw += each;
    else missing.push({ key: s.key, label: s.label, points: each });
  }

  if (profile?.is_verified) raw += VERIFIED_WEIGHT;
  else missing.push({ key: "is_verified", label: "Become a verified seller", points: VERIFIED_WEIGHT });

  return {
    pct: Math.round(raw),
    missing,
    canSell: raw > MIN_TO_SELL,
  };
}