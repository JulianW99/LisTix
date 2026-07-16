import type { User } from "../types";

export const hasPermission = (user: User | null, permission: string) => Boolean(
  user && (
    user.accountRole === "owner"
    || user.permissions.includes("*")
    || user.permissions.includes(permission)
  )
);
