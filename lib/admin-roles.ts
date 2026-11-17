export type AdminRole = "super_admin" | "moderator" | "support";

export function can(role: AdminRole | null | undefined, allowed: AdminRole[]) {
  return role === "super_admin" || (!!role && allowed.includes(role));
}