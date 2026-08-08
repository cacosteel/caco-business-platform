import { getUserProfile } from "./authService";

export async function getUserRole() {
  const profile = await getUserProfile();

  if (!profile) return null;

  return profile.role;
}

export async function hasRole(role: string) {
  const userRole = await getUserRole();

  return userRole === role;
}

export async function isAdmin() {
  const userRole = await getUserRole();

  return userRole === "admin";
}