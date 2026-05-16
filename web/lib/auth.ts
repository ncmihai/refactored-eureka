export type AppRole = "super_admin" | "admin_firma" | "consultant";
export type AccountStatus = "active" | "pending_approval" | "rejected" | "disabled";

export type AppAuthUser = {
  id: string;
  email?: string | null;
  nume?: string | null;
  role?: AppRole | null;
  accountStatus?: AccountStatus | null;
  firm?: string | { id?: string; nume?: string | null } | null;
};

export type AuthStatus = {
  authenticated: boolean;
  user: AppAuthUser | null;
};

export function roleLabel(role?: AppRole | null) {
  if (role === "super_admin") return "Super admin";
  if (role === "admin_firma") return "Admin firmă";
  if (role === "consultant") return "Consultant";
  return "Utilizator";
}

export function accountStatusLabel(status?: AccountStatus | null) {
  if (status === "active") return "Activ";
  if (status === "pending_approval") return "În aprobare";
  if (status === "rejected") return "Respins";
  if (status === "disabled") return "Dezactivat";
  return "Status necunoscut";
}

export function hasBetaAccess(user: AppAuthUser | null) {
  return user?.accountStatus === undefined || user.accountStatus === null || user.accountStatus === "active";
}

export function displayName(user: AppAuthUser | null) {
  if (!user) return "";
  return user.nume || user.email || "Utilizator";
}
