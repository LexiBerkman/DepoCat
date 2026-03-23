"use server";

import { randomBytes } from "crypto";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { logAudit } from "@/lib/audit";
import { authenticateUser, createSession, destroySession, requireOwner, requireSession } from "@/lib/auth";
import { ImportError, parseWorkbook, maybeDate, splitMultiValue } from "@/lib/import";
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

const changePasswordSchema = z
  .object({
    currentPassword: z.string().min(12),
    newPassword: z.string().min(14),
    confirmPassword: z.string().min(14),
  })
  .refine((data) => data.newPassword === data.confirmPassword, {
    message: "The new passwords did not match.",
    path: ["confirmPassword"],
  });

const ownerResetSchema = z.object({
  targetUserId: z.string().min(1),
});

const communicationSchema = z.object({
  depositionTargetId: z.string().min(1),
  communicationType: z.enum(["FIRST_REQUEST", "SECOND_REQUEST", "FINAL_NOTICE"]),
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

export async function changePasswordAction(
  _: { error: string; success: string },
  formData: FormData,
) {
  const session = await requireSession();
  const parsed = changePasswordSchema.safeParse({
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  });

  if (!parsed.success) {
    return {
      error: parsed.error.issues[0]?.message ?? "Enter your current password and a stronger new password.",
      success: "",
    };
  }

  if (parsed.data.currentPassword === parsed.data.newPassword) {
    return {
      error: "Choose a new password that is different from the current one.",
      success: "",
    };
  }

  const user = await prisma.user.findUnique({
    where: { id: session.userId },
  });

  if (!user || user.status !== "ACTIVE") {
    return {
      error: "Your account could not be verified. Please sign in again.",
      success: "",
    };
  }

  const currentPasswordMatches = await bcrypt.compare(parsed.data.currentPassword, user.passwordHash);
  if (!currentPasswordMatches) {
    await logAudit({
      userId: session.userId,
      action: "PASSWORD_CHANGE_FAILED",
      entityType: "User",
      entityId: session.userId,
    });
    return {
      error: "The current password you entered was incorrect.",
      success: "",
    };
  }

  const passwordHash = await bcrypt.hash(parsed.data.newPassword, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: session.userId },
      data: { passwordHash },
    }),
    prisma.session.updateMany({
      where: {
        userId: session.userId,
        revokedAt: null,
        tokenId: {
          not: session.sessionId,
        },
      },
      data: {
        revokedAt: new Date(),
      },
    }),
  ]);

  await logAudit({
    userId: session.userId,
    action: "PASSWORD_CHANGED",
    entityType: "User",
    entityId: session.userId,
  });

  revalidatePath("/");
  return {
    error: "",
    success: "Password updated. Other active sessions for this user have been signed out.",
  };
}

export async function ownerResetPasswordAction(
  _: { error: string; success: string; temporaryPassword: string; targetEmail: string },
  formData: FormData,
) {
  const session = await requireOwner();
  const parsed = ownerResetSchema.safeParse({
    targetUserId: formData.get("targetUserId"),
  });

  if (!parsed.success) {
    return {
      error: "Choose a user before issuing a reset.",
      success: "",
      temporaryPassword: "",
      targetEmail: "",
    };
  }

  const targetUser = await prisma.user.findUnique({
    where: { id: parsed.data.targetUserId },
  });

  if (!targetUser || targetUser.status !== "ACTIVE") {
    return {
      error: "That user account is not available for reset.",
      success: "",
      temporaryPassword: "",
      targetEmail: "",
    };
  }

  const temporaryPassword = randomBytes(18).toString("base64");
  const passwordHash = await bcrypt.hash(temporaryPassword, 12);

  await prisma.$transaction([
    prisma.user.update({
      where: { id: targetUser.id },
      data: { passwordHash },
    }),
    prisma.session.updateMany({
      where: {
        userId: targetUser.id,
        revokedAt: null,
      },
      data: {
        revokedAt: new Date(),
      },
    }),
  ]);

  await logAudit({
    userId: session.userId,
    action: "OWNER_PASSWORD_RESET",
    entityType: "User",
    entityId: targetUser.id,
    metadata: { targetEmail: targetUser.email },
  });

  revalidatePath("/");
  return {
    error: "",
    success: `Temporary password issued for ${targetUser.email}. Share it securely and have them change it after signing in.`,
    temporaryPassword,
    targetEmail: targetUser.email,
  };
}

export async function logCommunicationAction(
  _: { error: string; success: string },
  formData: FormData,
) {
  const session = await requireSession();
  const parsed = communicationSchema.safeParse({
    depositionTargetId: formData.get("depositionTargetId"),
    communicationType: formData.get("communicationType"),
  });

  if (!parsed.success) {
    return { error: "Select a valid communication type.", success: "" };
  }

  const deposition = await prisma.depositionTarget.findUnique({
    where: { id: parsed.data.depositionTargetId },
    include: {
      matter: {
        include: {
          opposingCounsel: {
            orderBy: { fullName: "asc" },
          },
        },
      },
      communications: {
        orderBy: { sentAt: "desc" },
        take: 1,
      },
    },
  });

  if (!deposition) {
    return { error: "That deponent record could not be found.", success: "" };
  }

  const sentAt = new Date();
  const recipients = deposition.matter.opposingCounsel.map((counsel) => counsel.email).join("; ");
  const subject = `Deposition scheduling request - ${deposition.matter.referenceNumber}`;

  const followUpStage =
    parsed.data.communicationType === "FIRST_REQUEST"
      ? "SECOND_EMAIL_PENDING"
      : parsed.data.communicationType === "SECOND_REQUEST"
        ? "FINAL_NOTICE_PENDING"
        : "AWAITING_RESPONSE";

  const followUpDueDate =
    parsed.data.communicationType === "FINAL_NOTICE" ? addDays(sentAt, 1) : addDays(sentAt, 3);

  await prisma.$transaction([
    prisma.communicationLog.create({
      data: {
        depositionTargetId: deposition.id,
        sentByUserId: session.userId,
        communicationType: parsed.data.communicationType,
        subject,
        recipients,
        sentAt,
      },
    }),
    prisma.depositionTarget.update({
      where: { id: deposition.id },
      data: {
        status: "REQUESTED",
        requestedDate:
          deposition.requestedDate ??
          (parsed.data.communicationType === "FIRST_REQUEST" ? sentAt : deposition.requestedDate),
        followUpStage,
        followUpDueDate,
        lastContactedAt: sentAt,
      },
    }),
  ]);

  await logAudit({
    userId: session.userId,
    action: "LOG_COMMUNICATION",
    entityType: "DepositionTarget",
    entityId: deposition.id,
    metadata: {
      communicationType: parsed.data.communicationType,
      referenceNumber: deposition.matter.referenceNumber,
    },
  });

  revalidatePath("/");
  return { error: "", success: "Logged." };
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
    const rows = await parseWorkbook(Buffer.from(await file.arrayBuffer()), file.name);

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

      const counselNames = splitMultiValue(row.counselName);
      const counselEmails = splitMultiValue(row.counselEmail);
      const counselFirms = splitMultiValue(row.counselFirm);

      for (const [index, email] of counselEmails.entries()) {
        const counsel = await prisma.opposingCounsel.findFirst({
          where: {
            matterId: matter.id,
            email,
          },
        });

        if (!counsel) {
          await prisma.opposingCounsel.create({
            data: {
              matterId: matter.id,
              fullName: counselNames[index] || counselNames[0] || "Opposing Counsel",
              email,
              firmName: counselFirms[index] || counselFirms[0] || undefined,
            },
          });
        }
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
  } catch (error) {
    if (error instanceof ImportError) {
      return {
        error: error.message,
        success: "",
      };
    }

    return {
      error: "The workbook could not be imported. Please confirm the columns and email addresses are valid.",
      success: "",
    };
  }
}
