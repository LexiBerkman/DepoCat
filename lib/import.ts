import "server-only";

import { Readable } from "stream";

import ExcelJS from "exceljs";
import { ZodError, z } from "zod";

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

const headerAliases = {
  referenceNumber: [
    "referencenumber",
    "reference",
    "referenceno",
    "refnumber",
    "refno",
    "ref#",
    "filenumber",
    "caseid",
  ],
  clientName: ["clientname", "client", "clientfullname", "plaintiff"],
  deponentName: ["deponentname", "deponent", "witnessname", "witness"],
  deponentRole: ["deponentrole", "role", "title", "designation"],
  requestedDate: ["requesteddate", "requestdate", "datedepositionrequested", "requestsent"],
  scheduledDate: ["scheduleddate", "depositiondate", "setdate", "noticeddate"],
  counselName: ["counselname", "attorneyname", "opposingcounsel", "lawyername", "attorney"],
  counselEmail: ["counselemail", "email", "attorneyemail", "opposingcounselemail", "lawyeremail"],
  counselFirm: ["counselfirm", "firm", "lawfirm", "firmname"],
  notes: ["notes", "comments", "memo", "description"],
} satisfies Record<keyof ImportRow, string[]>;

export class ImportError extends Error {}

function normalizeHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[#()]/g, "")
    .replace(/\s+/g, "");
}

function valueForAlias(record: Record<string, string>, field: keyof ImportRow) {
  for (const alias of headerAliases[field]) {
    if (record[alias]) {
      return record[alias];
    }
  }

  return undefined;
}

function isBlankRow(record: Record<string, string>) {
  return Object.values(record).every((value) => value.trim() === "");
}

function stringifyCell(value: unknown) {
  if (value instanceof Date) {
    return value.toISOString().slice(0, 10);
  }

  return String(value ?? "").trim();
}

async function loadWorksheet(buffer: Buffer, filename?: string) {
  const workbook = new ExcelJS.Workbook();

  if (filename?.toLowerCase().endsWith(".csv")) {
    await workbook.csv.read(Readable.from(buffer));
  } else if (filename?.toLowerCase().endsWith(".xls")) {
    throw new ImportError("Older .xls files are not supported yet. Please resave the workbook as .xlsx or .csv.");
  } else {
    await workbook.xlsx.load(buffer as never);
  }

  const sheet = workbook.worksheets[0];

  if (!sheet) {
    throw new ImportError("The uploaded workbook did not contain a readable worksheet.");
  }

  return sheet;
}

export async function parseWorkbook(buffer: Buffer, filename?: string): Promise<ImportRow[]> {
  const sheet = await loadWorksheet(buffer, filename);
  const headerRow = sheet.getRow(1);
  const headerValues = Array.isArray(headerRow.values) ? headerRow.values.slice(1) : [];
  const headers = headerValues.map((value) => normalizeHeader(String(value ?? "")));

  const missingRequiredColumns = [
    "referenceNumber",
    "clientName",
    "deponentName",
    "counselName",
    "counselEmail",
  ].filter((field) => !valueForAlias(Object.fromEntries(headers.map((header) => [header, header])), field as keyof ImportRow));

  if (missingRequiredColumns.length > 0) {
    throw new ImportError(
      `Missing required column(s): ${missingRequiredColumns.join(", ")}. Please check the header row.`,
    );
  }

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
        normalized[header] = stringifyCell(value);
      }
    });

    if (isBlankRow(normalized)) {
      return;
    }

    try {
      rows.push(
        rowSchema.parse({
          referenceNumber: valueForAlias(normalized, "referenceNumber"),
          clientName: valueForAlias(normalized, "clientName"),
          deponentName: valueForAlias(normalized, "deponentName"),
          deponentRole: valueForAlias(normalized, "deponentRole") || undefined,
          requestedDate: valueForAlias(normalized, "requestedDate") || undefined,
          scheduledDate: valueForAlias(normalized, "scheduledDate") || undefined,
          counselName: valueForAlias(normalized, "counselName"),
          counselEmail: valueForAlias(normalized, "counselEmail"),
          counselFirm: valueForAlias(normalized, "counselFirm") || undefined,
          notes: valueForAlias(normalized, "notes") || undefined,
        }),
      );
    } catch (error) {
      if (error instanceof ZodError) {
        const field = error.issues[0]?.path.join(".") || "row";
        throw new ImportError(`Row ${rowNumber} is invalid near "${field}". Please check that row's required fields and email address.`);
      }

      throw error;
    }
  });

  if (rows.length === 0) {
    throw new ImportError("The workbook did not contain any importable rows beneath the header row.");
  }

  return rows;
}

export function maybeDate(value?: string) {
  if (!value) {
    return undefined;
  }

  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? undefined : date;
}
