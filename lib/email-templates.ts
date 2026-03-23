export type EmailTemplateKey = "FIRST" | "SECOND" | "FINAL";

export function buildEmailSubject(deponentName: string, referenceNumber: string) {
  return `Deposition of ${deponentName} - ${referenceNumber}`;
}

export function buildEmailBody(params: {
  template: EmailTemplateKey;
  deponentName: string;
  lastSentDateLabel?: string | null;
}) {
  const { template, deponentName, lastSentDateLabel } = params;

  if (template === "FIRST") {
    return [
      "Counsel:",
      "",
      `I am writing to schedule the deposition of ${deponentName}. Please send me three dates and times that work for your calendar, and if one of those dates works for us, we will send out the proper notice.`,
      "",
      "Thank you.",
    ].join("\n");
  }

  if (template === "SECOND") {
    return [
      "Counsel:",
      "",
      `This is a follow-up to our ${lastSentDateLabel ? `email of ${lastSentDateLabel}` : "last email"} regarding the deposition of ${deponentName}. Please send three dates and times that work for your calendar, and if one of those dates works for us, we will send out the notice accordingly.`,
      "",
      "Thank you.",
    ].join("\n");
  }

  return [
    "Counsel:",
    "",
    `This is our final follow-up${lastSentDateLabel ? ` to our ${lastSentDateLabel} email` : ""} regarding the deposition of ${deponentName}. Please provide three dates and times for your calendar immediately.`,
    "",
    "This correspondence is intended to satisfy the parties' good-faith conference obligations under USCR 6.4(B) regarding discovery scheduling and related disputes. If we do not receive dates, we will proceed accordingly and may present our efforts to the Court as needed.",
    "",
    "Thank you.",
  ].join("\n");
}

export function buildEmailDraft(params: {
  template: EmailTemplateKey;
  deponentName: string;
  referenceNumber: string;
  lastSentDateLabel?: string | null;
}) {
  const subject = buildEmailSubject(params.deponentName, params.referenceNumber);
  const body = buildEmailBody({
    template: params.template,
    deponentName: params.deponentName,
    lastSentDateLabel: params.lastSentDateLabel,
  });

  return [`Subject: ${subject}`, "", body].join("\n");
}
