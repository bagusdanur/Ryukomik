import "server-only";

import { bearerToken } from "@/lib/social/auth";
import { getRoleFromBearerToken } from "@/lib/serverRoleCache";

export async function requireModerator(request: Request) {
  const token = bearerToken(request);
  if (!token) throw new Error("UNAUTHORIZED");
  const role = await getRoleFromBearerToken(token);
  if (!role.isAdmin && !role.isStaff) throw new Error("FORBIDDEN");
  return role;
}
