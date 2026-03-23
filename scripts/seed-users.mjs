import "dotenv/config";

import bcrypt from "bcryptjs";
import { PrismaClient } from "@prisma/client";

const prisma = new PrismaClient();

async function upsertUser({ email, fullName, password, role }) {
  if (!email || !fullName || !password) {
    return;
  }

  const passwordHash = await bcrypt.hash(password, 12);

  await prisma.user.upsert({
    where: { email: email.toLowerCase() },
    update: {
      fullName,
      passwordHash,
      role,
      status: "ACTIVE",
    },
    create: {
      email: email.toLowerCase(),
      fullName,
      passwordHash,
      role,
      status: "ACTIVE",
    },
  });
}

async function main() {
  await upsertUser({
    email: process.env.DEPOCAT_OWNER_EMAIL,
    fullName: process.env.DEPOCAT_OWNER_NAME ?? "Lead Attorney",
    password: process.env.DEPOCAT_OWNER_PASSWORD,
    role: "OWNER",
  });

  await upsertUser({
    email: process.env.DEPOCAT_PARALEGAL_EMAIL,
    fullName: process.env.DEPOCAT_PARALEGAL_NAME ?? "Paralegal",
    password: process.env.DEPOCAT_PARALEGAL_PASSWORD,
    role: "PARALEGAL",
  });

  const legacyUsers = [
    {
      email: "owner@depocat.local",
      expectedEmail: process.env.DEPOCAT_OWNER_EMAIL?.toLowerCase(),
    },
    {
      email: "paralegal@depocat.local",
      expectedEmail: process.env.DEPOCAT_PARALEGAL_EMAIL?.toLowerCase(),
    },
  ];

  for (const legacyUser of legacyUsers) {
    if (legacyUser.expectedEmail && legacyUser.expectedEmail !== legacyUser.email) {
      await prisma.user.updateMany({
        where: { email: legacyUser.email },
        data: { status: "DISABLED" },
      });
    }
  }
}

main()
  .catch((error) => {
    console.error(error);
    process.exitCode = 1;
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
