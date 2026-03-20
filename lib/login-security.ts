import "server-only";

import { subMinutes } from "date-fns";

import { prisma } from "@/lib/prisma";

const MAX_FAILED_ATTEMPTS = 5;
const WINDOW_MINUTES = 15;

export async function isLoginBlocked(email: string, ipAddress?: string) {
  const cutoff = subMinutes(new Date(), WINDOW_MINUTES);

  const failedAttempts = await prisma.loginAttempt.count({
    where: {
      createdAt: { gte: cutoff },
      successful: false,
      OR: [
        { email: email.toLowerCase() },
        ...(ipAddress ? [{ ipAddress }] : []),
      ],
    },
  });

  return failedAttempts >= MAX_FAILED_ATTEMPTS;
}

export async function recordLoginAttempt(params: {
  email: string;
  ipAddress?: string;
  successful: boolean;
  userId?: string;
}) {
  await prisma.loginAttempt.create({
    data: {
      email: params.email.toLowerCase(),
      ipAddress: params.ipAddress,
      successful: params.successful,
      userId: params.userId,
    },
  });
}
