"use server";

import { randomBytes } from "crypto";

import bcrypt from "bcryptjs";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { z } from "zod";

import { logAudit } from "@/lib/audit";
import { authenticateUser, createSession, destroySession, requireOwner, requireSession } from "@/lib/auth";
import { getFollowUpStateFromHistory } from "@/lib/deposition-workflow";
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

const scheduledDateSchema = z.object({
  depositionTargetId: z.string().min(1),
  scheduledDate: z.string().optional(),
});

const deleteDeponentSchema = z.object({
  depositionTargetId: z.string().min(1),
});

const updateCounselEmailsSchema = z.object({
  matterId: z.string().min(1),
  counselEmails: z.string().min(1),
});

function parseScheduledDateInput(value: string) {
  const trimmed = value.trim();

  if (!trimmed) {
    return null;
  }

  // yyyy-mm-dd (ISO)
  const isoMatch = trimmed.match(/^(\d{4})-(\d{2})-(\d{2})$/);
  if (isoMatch) {
    const [, year, month, day] = isoMatch;
    if (Number(year) < 1900) return null;
    const parsed = new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0, 0);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  // mm/dd/yyyy (US format — matches the input placeholder)
  const mdyMatch = trimmed.match(/^(\d{1,2})\/(\d{1,2})\/(\d{4})$/);
  if (mdyMatch) {
    const [, month, day, year] = mdyMatch;
    if (Number(year) < 1900) return null;
    const parsed = new Date(Number(year), Number(month) - 1, Number(day), 12, 0, 0, 0);
    return Number.isNaN(parsed.getTime()) ? null : parsed;
  }

  return null;
}

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
  _: {
    error: string;
    success: string;
    communicationType: string;
    sentAt: string;
    followUpStage: string;
    followUpDueDateValue: string;
  },
  formData: FormData,
) {
  const session = await requireSession();
  const parsed = communicationSchema.safeParse({
    depositionTargetId: formData.get("depositionTargetId"),
    communicationType: formData.get("communicationType"),
  });

  if (!parsed.success) {
    return {
      error: "Select a valid communication type.",
      success: "",
      communicationType: "",
      sentAt: "",
      followUpStage: "",
      followUpDueDateValue: "",
    };
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
    return {
      error: "That deponent record could not be found.",
      success: "",
      communicationType: "",
      sentAt: "",
      followUpStage: "",
      followUpDueDateValue: "",
    };
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
  return {
    error: "",
    success: "Logged.",
    communicationType: parsed.data.communicationType,
    sentAt: sentAt.toISOString(),
    followUpStage,
    followUpDueDateValue: followUpDueDate.toISOString(),
  };
}

export async function createMatterAction(_: { error: string }, formData: FormData) {
  const session = await requireSession();
  const parsed = matterSchema.safeParse({
    referenceNumber: formData.get("referenceNumber"),
    clientName: formData.get("clientName"),
    notes: formData.get("notes") || undefined,
  });

  if (!parsed.success) {
    return { error: "Please complete all required matter fields." };
  }

  const deponentNames = formData
    .getAll("deponentName")
    .map((value) => String(value).trim())
    .filter(Boolean);
  const deponentRoles = formData
    .getAll("deponentRole")
    .map((value) => String(value).trim());

  if (deponentNames.length === 0) {
    return { error: "Add at least one deponent before saving the matter." };
  }

  const counselNames = formData
    .getAll("counselName")
    .map((value) => String(value).trim());
  const counselEmails = formData
    .getAll("counselEmail")
    .map((value) => String(value).trim());

  const counselEntries = counselEmails
    .map((email, index) => ({
      fullName: counselNames[index] || "",
      email,
    }))
    .filter((entry) => entry.fullName || entry.email);

  if (counselEntries.length === 0) {
    return { error: "Add at least one opposing counsel name and email before saving the matter." };
  }

  for (const entry of counselEntries) {
    if (!entry.fullName || !entry.email) {
      return { error: "Each opposing counsel entry needs both a name and an email address." };
    }

    const emailCheck = z.string().email().safeParse(entry.email);
    if (!emailCheck.success) {
      return { error: `The counsel email "${entry.email}" is not a valid email address.` };
    }
  }

  await prisma.matter.upsert({
    where: { referenceNumber: parsed.data.referenceNumber },
    update: {
      clientName: parsed.data.clientName,
      notes: parsed.data.notes,
      opposingCounsel: {
        create: counselEntries,
      },
      depositions: {
        create: deponentNames.map((deponentName, index) => ({
          fullName: deponentName,
          roleTitle: deponentRoles[index] || undefined,
          status: "NEEDS_REQUEST",
          followUpStage: "FIRST_EMAIL_PENDING",
        })),
      },
    },
    create: {
      referenceNumber: parsed.data.referenceNumber,
      clientName: parsed.data.clientName,
      notes: parsed.data.notes,
      createdById: session.userId,
      opposingCounsel: {
        create: counselEntries,
      },
      depositions: {
        create: deponentNames.map((deponentName, index) => ({
          fullName: deponentName,
          roleTitle: deponentRoles[index] || undefined,
          status: "NEEDS_REQUEST",
          followUpStage: "FIRST_EMAIL_PENDING",
        })),
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

export async function updateScheduledDateAction(
  _: {
    error: string;
    success: string;
    scheduledDateValue: string;
    followUpStage: string;
    followUpDueDateValue: string;
  },
  formData: FormData,
) {
  const session = await requireSession();
  const parsed = scheduledDateSchema.safeParse({
    depositionTargetId: formData.get("depositionTargetId"),
    scheduledDate: formData.get("scheduledDate") || "",
  });

  if (!parsed.success) {
    return {
      error: "Enter a valid scheduled date.",
      success: "",
      scheduledDateValue: "",
      followUpStage: "",
      followUpDueDateValue: "",
    };
  }

  const deposition = await prisma.depositionTarget.findUnique({
    where: { id: parsed.data.depositionTargetId },
    include: {
      communications: {
        orderBy: { sentAt: "desc" },
        take: 1,
      },
    },
  });

  if (!deposition) {
    return {
      error: "That deponent record could not be found.",
      success: "",
      scheduledDateValue: "",
      followUpStage: "",
      followUpDueDateValue: "",
    };
  }

  const scheduledDate = parseScheduledDateInput(parsed.data.scheduledDate ?? "");

  if ((parsed.data.scheduledDate ?? "").trim() && !scheduledDate) {
    return {
      error: "Enter a valid scheduled date.",
      success: "",
      scheduledDateValue: "",
      followUpStage: "",
      followUpDueDateValue: "",
    };
  }

  const lastCommunication = deposition.communications[0];
  const followUpState = getFollowUpStateFromHistory(lastCommunication?.communicationType);

  await prisma.depositionTarget.update({
    where: { id: deposition.id },
    data: scheduledDate
      ? {
          scheduledDate,
          status: "SCHEDULED",
          followUpStage: "SCHEDULED",
          followUpDueDate: null,
        }
      : {
          scheduledDate: null,
          status: followUpState.status,
          followUpStage: followUpState.followUpStage,
          followUpDueDate: followUpState.followUpDueDate,
        },
  });

  await logAudit({
    userId: session.userId,
    action: "UPDATE_SCHEDULED_DATE",
    entityType: "DepositionTarget",
    entityId: deposition.id,
    metadata: {
      scheduledDate: scheduledDate ? scheduledDate.toISOString() : "cleared",
    },
  });

  return {
    error: "",
    success: scheduledDate ? "Scheduled date saved." : "Scheduled date cleared.",
    scheduledDateValue: scheduledDate ? parsed.data.scheduledDate?.trim() ?? "" : "",
    followUpStage: scheduledDate ? "SCHEDULED" : followUpState.followUpStage,
    followUpDueDateValue:
      scheduledDate || !followUpState.followUpDueDate
        ? ""
        : followUpState.followUpDueDate.toISOString(),
  };
}

export async function deleteDeponentAction(
  _: { error: string; success: string },
  formData: FormData,
) {
  const session = await requireSession();
  const parsed = deleteDeponentSchema.safeParse({
    depositionTargetId: formData.get("depositionTargetId"),
  });

  if (!parsed.success) {
    return { error: "Choose a valid deponent to delete.", success: "" };
  }

  const deposition = await prisma.depositionTarget.findUnique({
    where: { id: parsed.data.depositionTargetId },
    include: {
      matter: true,
    },
  });

  if (!deposition) {
    return { error: "That deponent could not be found.", success: "" };
  }

  await prisma.depositionTarget.delete({
    where: { id: deposition.id },
  });

  await logAudit({
    userId: session.userId,
    action: "DELETE_DEPONENT",
    entityType: "DepositionTarget",
    entityId: deposition.id,
    metadata: {
      deponentName: deposition.fullName,
      referenceNumber: deposition.matter.referenceNumber,
    },
  });

  return { error: "", success: "Deleted." };
}

export async function updateCounselEmailsAction(
  _: { error: string; success: string; counselEmailsValue: string },
  formData: FormData,
) {
  const session = await requireSession();
  const parsed = updateCounselEmailsSchema.safeParse({
    matterId: formData.get("matterId"),
    counselEmails: formData.get("counselEmails"),
  });

  if (!parsed.success) {
    return {
      error: "Enter at least one valid attorney email.",
      success: "",
      counselEmailsValue: "",
    };
  }

  const matter = await prisma.matter.findUnique({
    where: { id: parsed.data.matterId },
    include: {
      opposingCounsel: {
        orderBy: { createdAt: "asc" },
      },
    },
  });

  if (!matter) {
    return {
      error: "That matter could not be found.",
      success: "",
      counselEmailsValue: "",
    };
  }

  const emails = parsed.data.counselEmails
    .split(";")
    .map((value) => value.trim())
    .filter(Boolean);

  const emailSchema = z.string().email();
  const invalidEmail = emails.find((email) => !emailSchema.safeParse(email).success);

  if (emails.length === 0 || invalidEmail) {
    return {
      error: "Enter valid email addresses separated by semicolons.",
      success: "",
      counselEmailsValue: parsed.data.counselEmails,
    };
  }

  await prisma.$transaction(async (tx) => {
    const existingCounsel = matter.opposingCounsel;
    const sharedCount = Math.min(existingCounsel.length, emails.length);

    for (let index = 0; index < sharedCount; index += 1) {
      await tx.opposingCounsel.update({
        where: { id: existingCounsel[index].id },
        data: { email: emails[index] },
      });
    }

    if (emails.length > existingCounsel.length) {
      for (let index = existingCounsel.length; index < emails.length; index += 1) {
        await tx.opposingCounsel.create({
          data: {
            matterId: matter.id,
            fullName: `Opposing Counsel ${index + 1}`,
            email: emails[index],
          },
        });
      }
    }

    if (existingCounsel.length > emails.length) {
      const counselToDelete = existingCounsel.slice(emails.length);
      await tx.opposingCounsel.deleteMany({
        where: {
          id: {
            in: counselToDelete.map((counsel) => counsel.id),
          },
        },
      });
    }
  });

  await logAudit({
    userId: session.userId,
    action: "UPDATE_COUNSEL_EMAILS",
    entityType: "Matter",
    entityId: matter.id,
    metadata: {
      referenceNumber: matter.referenceNumber,
      emailCount: emails.length,
    },
  });

  return {
    error: "",
    success: "Attorney emails updated.",
    counselEmailsValue: emails.join("; "),
  };
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
