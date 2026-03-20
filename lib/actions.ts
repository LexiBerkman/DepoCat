"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { logAudit } from "@/lib/audit";
import { authenticateUser, createSession, destroySession, requireSession } from "@/lib/auth";
import { parseWorkbook, maybeDate } from "@/lib/import";
import { isLoginBlocked, recordLoginAttempt } from "@/lib/login-security";
import { prisma } from "@/lib/prisma";
import { getRequestContext } from "@/lib/request-context";
import { addDays } from "@/lib/utils";

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string().min(12),
});

const matterSchema = z.object({
  referenceNumber: z.string().min(1),
  clientName: z.string().min(1),
  deponentName: z.string().min(1),
  deponentRole: z.string().optional(),
  counselName: z.string().min(1),
  counselEmail: z.string().email(),
  notes: z.string().optional(),
});

export async function loginAction(_: { error: string }, formData: FormData) {
  const { ipAddress, userAgent } = await getRequestContext();
  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });

  if (!parsed.success) {
    return { error: "Enter the admin email and a strong password." };
  }

  if (await isLoginBlocked(parsed.data.email, ipAddress)) {
    return {
      error: "Too many login attempts. Please wait 15 minutes before trying again.",
    };
  }

  const user = await authenticateUser(parsed.data.email, parsed.data.password);

  if (!user) {
    await recordLoginAttempt({
      email: parsed.data.email,
      ipAddress,
      successful: false,
    });
    await logAudit({
      action: "LOGIN_FAILED",
      entityType: "User",
      metadata: { email: parsed.data.email.toLowerCase(), ipAddress: ipAddress ?? "unknown" },
    });
    return { error: "That email/password combination did not match an active DepoCat user." };
  }

  await prisma.user.update({
    where: { id: user.id },
    data: { lastLoginAt: new Date() },
  });

  await createSession({
    userId: user.id,
    email: user.email,
    fullName: user.fullName,
    role: user.role,
    ipAddress,
    userAgent,
  });
  await recordLoginAttempt({
    email: user.email,
    ipAddress,
    successful: true,
    userId: user.id,
  });
  await logAudit({
    userId: user.id,
    action: "LOGIN",
    entityType: "User",
    entityId: user.id,
    metadata: { email: user.email, role: user.role, ipAddress: ipAddress ?? "unknown" },
  });
  redirect("/");
}

export async function logoutAction() {
  const session = await requireSession();
  await logAudit({
    userId: session.userId,
    action: "LOGOUT",
    entityType: "User",
    entityId: session.userId,
  });
  await destroySession();
  redirect("/login");
}

export async function createMatterAction(_: { error: string }, formData: FormData) {
  const session = await requireSession();
  const parsed = matterSchema.safeParse({
    referenceNumber: formData.get("referenceNumber"),
    clientName: formData.get("clientName"),
    deponentName: formData.get("deponentName"),
    deponentRole: formData.get("deponentRole") || undefined,
    counselName: formData.get("counselName"),
    counselEmail: formData.get("counselEmail"),
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return { error: "Please complete all required matter fields." };
  }

  const now = new Date();

  await prisma.matter.upsert({
    where: { referenceNumber: parsed.data.referenceNumber },
    update: {
      clientName: parsed.data.clientName,
      notes: parsed.data.notes,
      opposingCounsel: {
        create: {
          fullName: parsed.data.counselName,
          email: parsed.data.counselEmail,
        },
      },
      depositions: {
        create: {
          fullName: parsed.data.deponentName,
          roleTitle: parsed.data.deponentRole,
          requestedDate: now,
          status: "REQUESTED",
          followUpStage: "SECOND_EMAIL_PENDING",
          followUpDueDate: addDays(now, 3),
          lastContactedAt: now,
        },
      },
    },
    create: {
      referenceNumber: parsed.data.referenceNumber,
      clientName: parsed.data.clientName,
      notes: parsed.data.notes,
      createdById: session.userId,
      opposingCounsel: {
        create: {
          fullName: parsed.data.counselName,
          email: parsed.data.counselEmail,
        },
      },
      depositions: {
        create: {
          fullName: parsed.data.deponentName,
          roleTitle: parsed.data.deponentRole,
          requestedDate: now,
          status: "REQUESTED",
          followUpStage: "SECOND_EMAIL_PENDING",
          followUpDueDate: addDays(now, 3),
          lastContactedAt: now,
        },
      },
    },
  });

  await logAudit({
    userId: session.userId,
    action: "UPSERT_MATTER",
    entityType: "Matter",
    entityId: parsed.data.referenceNumber,
    metadata: { referenceNumber: parsed.data.referenceNumber },
  });

  revalidatePath("/");
  return { error: "" };
}

export async function importWorkbookAction(
  _: { error: string; success: string },
  formData: FormData,
) {
  const session = await requireSession();
  const file = formData.get("file");

  if (!(file instanceof File)) {
    return { error: "Choose an Excel file before importing.", success: "" };
  }

  try {
    const rows = await parseWorkbook(Buffer.from(await file.arrayBuffer()));

    for (const row of rows) {
      const requestedDate = maybeDate(row.requestedDate);
      const scheduledDate = maybeDate(row.scheduledDate);

      const matter = await prisma.matter.upsert({
        where: { referenceNumber: row.referenceNumber },
        update: {
          clientName: row.clientName,
          notes: row.notes,
        },
        create: {
          referenceNumber: row.referenceNumber,
          clientName: row.clientName,
          notes: row.notes,
        },
      });

      const counsel = await prisma.opposingCounsel.findFirst({
        where: {
          matterId: matter.id,
          email: row.counselEmail,
        },
      });

      if (!counsel) {
        await prisma.opposingCounsel.create({
          data: {
            matterId: matter.id,
            fullName: row.counselName,
            email: row.counselEmail,
            firmName: row.counselFirm,
          },
        });
      }

      const existingTarget = await prisma.depositionTarget.findFirst({
        where: {
          matterId: matter.id,
          fullName: row.deponentName,
        },
      });

      const status = scheduledDate ? "SCHEDULED" : requestedDate ? "REQUESTED" : "NEEDS_REQUEST";
      const followUpStage = scheduledDate
        ? "SCHEDULED"
        : requestedDate
          ? "SECOND_EMAIL_PENDING"
          : "FIRST_EMAIL_PENDING";
      const dueDate = requestedDate ? addDays(requestedDate, 3) : undefined;

      if (existingTarget) {
        await prisma.depositionTarget.update({
          where: { id: existingTarget.id },
          data: {
            roleTitle: row.deponentRole,
            requestedDate,
            scheduledDate,
            status,
            followUpStage,
            followUpDueDate: dueDate,
            lastContactedAt: requestedDate,
          },
        });
      } else {
        await prisma.depositionTarget.create({
          data: {
            matterId: matter.id,
            fullName: row.deponentName,
            roleTitle: row.deponentRole,
            requestedDate,
            scheduledDate,
            status,
            followUpStage,
            followUpDueDate: dueDate,
            lastContactedAt: requestedDate,
          },
        });
      }
    }

    await logAudit({
      userId: session.userId,
      action: "IMPORT_WORKBOOK",
      entityType: "Workbook",
      metadata: { rows: rows.length },
    });

    revalidatePath("/");
    return { error: "", success: `Imported ${rows.length} spreadsheet row(s).` };
  } catch {
    return {
      error: "The workbook could not be imported. Please confirm the columns and email addresses are valid.",
      success: "",
    };
  }
}
