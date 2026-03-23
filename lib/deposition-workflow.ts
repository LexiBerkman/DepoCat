import type { CommunicationType, FollowUpStage } from "@prisma/client";
import { format } from "date-fns";

import type { EmailTemplateKey } from "@/lib/email-templates";
import { addDays } from "@/lib/utils";

export function toDate(value: string | Date | null | undefined) {
  if (!value) {
    return null;
  }

  const parsed = value instanceof Date ? value : new Date(value);
  return Number.isNaN(parsed.getTime()) ? null : parsed;
}

export function isValidScheduledDate(date: Date | null): boolean {
  if (!date) {
    return false;
  }

  return new Date(date).getFullYear() >= 1900;
}

export function formatOptionalDate(value: Date | null) {
  return value ? format(value, "MMM d, yyyy") : "Not set";
}

export function getFollowUpLabel(stage: string) {
  switch (stage) {
    case "FIRST_EMAIL_PENDING":
      return { label: "Schedule", className: "pill-neutral" };
    case "SECOND_EMAIL_PENDING":
      return { label: "2nd email due", className: "pill-warning" };
    case "FINAL_NOTICE_PENDING":
      return { label: "Final email due", className: "pill-danger" };
    case "SCHEDULED":
      return { label: "Scheduled", className: "pill-success" };
    default:
      return { label: "Awaiting reply", className: "pill-neutral" };
  }
}

export function getDraftTemplate(
  lastCommunicationType?: CommunicationType,
): EmailTemplateKey {
  if (lastCommunicationType === "FIRST_REQUEST") {
    return "SECOND";
  }

  if (
    lastCommunicationType === "SECOND_REQUEST" ||
    lastCommunicationType === "FINAL_NOTICE"
  ) {
    return "FINAL";
  }

  return "FIRST";
}

export function getFollowUpStateFromHistory(
  lastCommunicationType?: CommunicationType | null,
): {
  status: "NEEDS_REQUEST" | "REQUESTED";
  followUpStage: FollowUpStage;
  followUpDueDate: Date | null;
} {
  if (lastCommunicationType === "FINAL_NOTICE") {
    return {
      status: "REQUESTED",
      followUpStage: "AWAITING_RESPONSE",
      followUpDueDate: null,
    };
  }

  if (lastCommunicationType === "SECOND_REQUEST") {
    return {
      status: "REQUESTED",
      followUpStage: "FINAL_NOTICE_PENDING",
      followUpDueDate: addDays(new Date(), 3),
    };
  }

  if (lastCommunicationType === "FIRST_REQUEST") {
    return {
      status: "REQUESTED",
      followUpStage: "SECOND_EMAIL_PENDING",
      followUpDueDate: addDays(new Date(), 3),
    };
  }

  return {
    status: "NEEDS_REQUEST",
    followUpStage: "FIRST_EMAIL_PENDING",
    followUpDueDate: null,
  };
}

export function getDefaultCommunicationType(
  currentFollowUpStage: string,
): CommunicationType {
  if (currentFollowUpStage === "SECOND_EMAIL_PENDING") {
    return "FIRST_REQUEST";
  }

  if (currentFollowUpStage === "FINAL_NOTICE_PENDING") {
    return "SECOND_REQUEST";
  }

  return "FINAL_NOTICE";
}
