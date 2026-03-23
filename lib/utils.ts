export function buildOutlookComposeUrl(params: {
  to: string[];
  subject: string;
  body: string;
}) {
  const query = new URLSearchParams({
    to: params.to.join(";"),
    subject: params.subject,
    body: params.body,
  });

  return `https://outlook.office.com/mail/deeplink/compose?${query.toString()}`;
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
