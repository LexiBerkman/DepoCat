import "server-only";

import ExcelJS from "exceljs";
import { z } from "zod";

const rowSchema = z.object({
  referenceNumber: z.string().min(1),
  clientName: z.string().min(1),
  deponentName: z.string().min(1),
  deponentRole: z.string().optional(),
  requestedDate: z.string().optional(),
  scheduledDate: z.string().optional(),
  counselName: z.string().min(1),
  counselEmail: z.string().email(),
  counselFirm: z.string().optional(),
  notes: z.string().optional(),
});

export type ImportRow = z.infer<typeof rowSchema>;

function normalizeHeader(value: string) {
  return value.trim().toLowerCase().replace(/\s+/g, "");
}

export async function parseWorkbook(buffer: Buffer): Promise<ImportRow[]> {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(buffer as never);
  const sheet = workbook.worksheets[0];

  if (!sheet) {
    return [];
  }

  const headerRow = sheet.getRow(1);
  const headerValues = Array.isArray(headerRow.values) ? headerRow.values.slice(1) : [];
  const headers = headerValues.map((value) => normalizeHeader(String(value ?? "")));

  const rows: ImportRow[] = [];

  sheet.eachRow((row, rowNumber) => {
    if (rowNumber === 1) {
      return;
    }

    const normalized: Record<string, string> = {};

    const rowValues = Array.isArray(row.values) ? row.values.slice(1) : [];

    rowValues.forEach((value, index) => {
      const header = headers[index];
      if (header) {
        normalized[header] = String(value ?? "").trim();
      }
    });

    rows.push(
      rowSchema.parse({
        referenceNumber: normalized.referencenumber,
        clientName: normalized.clientname,
        deponentName: normalized.deponentname,
        deponentRole: normalized.deponentrole || undefined,
        requestedDate: normalized.requesteddate || undefined,
        scheduledDate: normalized.scheduleddate || undefined,
        counselName: normalized.counselname,
        counselEmail: normalized.counselemail,
        counselFirm: normalized.counselfirm || undefined,
        notes: normalized.notes || undefined,
      }),
    );
  });

  return rows;
}

export function maybeDate(value?: string) {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}
