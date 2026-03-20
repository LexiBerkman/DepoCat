import "server-only";

import { headers } from "next/headers";

export async function getRequestContext() {
  const headerStore = await headers();
  const forwardedFor = headerStore.get("x-forwarded-for");
  const ipAddress = forwardedFor?.split(",")[0]?.trim() || headerStore.get("x-real-ip") || undefined;
  const userAgent = headerStore.get("user-agent") || undefined;

  return { ipAddress, userAgent };
}
