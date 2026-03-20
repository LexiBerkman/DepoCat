import "server-only";

import { randomUUID } from "crypto";

import { SignJWT, jwtVerify } from "jose";
import bcrypt from "bcryptjs";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";

import { prisma } from "@/lib/prisma";

const COOKIE_NAME = "depocat_session";

export type AppSession = {
  sessionId: string;
  userId: string;
  email: string;
  fullName: string;
  role: "OWNER" | "PARALEGAL";
};

function getSecret() {
  const secret = process.env.SESSION_SECRET;
  if (!secret) {
    throw new Error("SESSION_SECRET is required.");
  }

  return new TextEncoder().encode(secret);
}

export async function createSession(params: {
  userId: string;
  email: string;
  fullName: string;
  role: "OWNER" | "PARALEGAL";
  ipAddress?: string;
  userAgent?: string;
}) {
  const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 12);
  const tokenId = randomUUID();

  await prisma.session.create({
    data: {
      tokenId,
      userId: params.userId,
      ipAddress: params.ipAddress,
      userAgent: params.userAgent?.slice(0, 500),
      expiresAt,
    },
  });

  const token = await new SignJWT({
    sessionId: tokenId,
    userId: params.userId,
    email: params.email,
    fullName: params.fullName,
    role: params.role,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("12h")
    .sign(getSecret());

  const cookieStore = await cookies();
  cookieStore.set(COOKIE_NAME, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "strict",
    path: "/",
    expires: expiresAt,
  });
}

export async function destroySession() {
  const session = await getSession();

  if (session?.sessionId) {
    await prisma.session.updateMany({
      where: {
        tokenId: session.sessionId,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    });
  }

  const cookieStore = await cookies();
  cookieStore.delete(COOKIE_NAME);
}

export async function getSession() {
  const cookieStore = await cookies();
  const token = cookieStore.get(COOKIE_NAME)?.value;

  if (!token) {
    return null;
  }

  try {
    const verified = await jwtVerify(token, getSecret());
    const payload = verified.payload as Partial<AppSession>;

    if (!payload.sessionId || !payload.userId) {
      return null;
    }

    const storedSession = await prisma.session.findFirst({
      where: {
        tokenId: payload.sessionId,
        userId: payload.userId,
        revokedAt: null,
        expiresAt: {
          gt: new Date(),
        },
      },
      include: {
        user: true,
      },
    });

    if (!storedSession || storedSession.user.status !== "ACTIVE") {
      return null;
    }

    await prisma.session.update({
      where: { id: storedSession.id },
      data: { lastSeenAt: new Date() },
    });

    return {
      sessionId: storedSession.tokenId,
      userId: storedSession.userId,
      email: storedSession.user.email,
      fullName: storedSession.user.fullName,
      role: storedSession.user.role,
    } satisfies AppSession;
  } catch {
    return null;
  }
}

export async function requireSession() {
  const session = await getSession();

  if (!session?.email || !session?.userId || !session?.role || !session?.fullName) {
    redirect("/login");
  }

  return session as AppSession;
}

export async function authenticateUser(email: string, password: string) {
  const user = await prisma.user.findUnique({
    where: { email: email.toLowerCase() },
  });

  if (!user || user.status !== "ACTIVE") {
    return null;
  }

  const passwordMatches = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatches) {
    return null;
  }

  return user;
}

export async function requireOwner() {
  const session = await requireSession();

  if (session.role !== "OWNER") {
    redirect("/");
  }

  return session;
}
