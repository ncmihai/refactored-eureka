export type AppRole = "super_admin" | "admin_firma" | "consultant";

export type AppAuthUser = {
  id: string;
  email?: string | null;
  nume?: string | null;
  role?: AppRole | null;
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

export function displayName(user: AppAuthUser | null) {
  if (!user) return "";
  return user.nume || user.email || "Utilizator";
}

