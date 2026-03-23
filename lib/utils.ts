export function buildMailto(params: {
  to: string[];
  subject: string;
  body: string;
}) {
  const query = new URLSearchParams({
    subject: params.subject,
    body: params.body,
  });

  return `mailto:${params.to.join(",")}?${query.toString()}`;
}

export function addDays(date: Date, days: number) {
  const next = new Date(date);
  next.setDate(next.getDate() + days);
  return next;
}
