import "server-only";

import JSZip from "jszip";
import { ZodError, z } from "zod";

const rowSchema = z.object({
  referenceNumber: z.string().min(1),
  clientName: z.string().min(1),
  deponentName: z.string().min(1),
  deponentRole: z.string().optional(),
  requestedDate: z.string().optional(),
  scheduledDate: z.string().optional(),
  counselName: z.string().optional(),
  counselEmail: z.string().optional(),
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
    "ref",
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

const REQUIRED_FIELDS: Array<keyof ImportRow> = [
  "referenceNumber",
  "clientName",
  "deponentName",
];

export class ImportError extends Error {}

function normalizeHeader(value: string) {
  return value
    .trim()
    .toLowerCase()
    .replace(/[#()]/g, "")
    .replace(/\s+/g, "");
}

function decodeXml(value: string) {
  return value
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function columnLetters(cellRef: string) {
  const match = cellRef.match(/^[A-Z]+/i);
  return match ? match[0].toUpperCase() : "";
}

function excelSerialToIsoDate(serialText: string) {
  const serial = Number(serialText);
  if (!Number.isFinite(serial)) {
    return serialText;
  }

  if (serial <= 1) {
    return "";
  }

  const utcDays = Math.floor(serial - 25569);
  const utcValue = utcDays * 86400;
  const dateInfo = new Date(utcValue * 1000);

  if (Number.isNaN(dateInfo.getTime())) {
    return serialText;
  }

  return dateInfo.toISOString().slice(0, 10);
}

function extractCellValue(cellXml: string) {
  const typeMatch = cellXml.match(/\bt="([^"]+)"/);
  const type = typeMatch?.[1];

  if (type === "inlineStr") {
    const textMatches = [...cellXml.matchAll(/<t[^>]*>([\s\S]*?)<\/t>/g)];
    return decodeXml(textMatches.map((match) => match[1]).join("")).trim();
  }

  const valueMatch = cellXml.match(/<v>([\s\S]*?)<\/v>/);
  return decodeXml(valueMatch?.[1] ?? "").trim();
}

function isBlankRow(record: Record<string, string>) {
  return Object.values(record).every((value) => value.trim() === "");
}

function valueForAlias(record: Record<string, string>, field: keyof ImportRow) {
  for (const alias of headerAliases[field]) {
    const value = record[alias];
    if (value && value.trim() !== "") {
      return value;
    }
  }

  return undefined;
}

async function parseXlsx(buffer: Buffer) {
  const zip = await JSZip.loadAsync(buffer);
  const worksheetXml = await zip.file("xl/worksheets/sheet1.xml")?.async("string");

  if (!worksheetXml) {
    throw new ImportError("The uploaded workbook did not contain a readable first worksheet.");
  }

  const rowMatches = [...worksheetXml.matchAll(/<row\b[^>]*r="(\d+)"[^>]*>([\s\S]*?)<\/row>/g)];

  return rowMatches.map(([, rowNumberText, rowXml]) => {
    const rowNumber = Number(rowNumberText);
    const cellMatches = [...rowXml.matchAll(/<c\b([^>]*)r="([A-Z]+\d+)"([^>]*)>([\s\S]*?)<\/c>|<c\b([^>]*)r="([A-Z]+\d+)"([^>]*)\/>/g)];
    const values: Record<string, string> = {};

    for (const match of cellMatches) {
      const cellRef = match[2] || match[6];
      const beforeAttrs = match[1] || match[5] || "";
      const afterAttrs = match[3] || match[7] || "";
      const cellInner = match[4] ?? "";
      const cellXml = `<c ${beforeAttrs} r="${cellRef}" ${afterAttrs}>${cellInner}</c>`;
      values[columnLetters(cellRef)] = extractCellValue(cellXml);
    }

    return { rowNumber, values };
  });
}

function parseCsv(buffer: Buffer) {
  const rows = buffer
    .toString("utf8")
    .replace(/^\uFEFF/, "")
    .split(/\r?\n/)
    .filter((line) => line.length > 0)
    .map((line, index) => ({
      rowNumber: index + 1,
      values: Object.fromEntries(
        line.split(",").map((value, cellIndex) => [String.fromCharCode(65 + cellIndex), value.trim()]),
      ),
    }));

  return rows;
}

export async function parseWorkbook(buffer: Buffer, filename?: string): Promise<ImportRow[]> {
  const isCsv = filename?.toLowerCase().endsWith(".csv");
  const isXls = filename?.toLowerCase().endsWith(".xls");

  if (isXls) {
    throw new ImportError("Older .xls files are not supported yet. Please resave the workbook as .xlsx or .csv.");
  }

  const parsedRows = isCsv ? parseCsv(buffer) : await parseXlsx(buffer);
  const headerSource = parsedRows[0];

  if (!headerSource) {
    throw new ImportError("The workbook appears to be empty.");
  }

  const letterToHeader = Object.fromEntries(
    Object.entries(headerSource.values).map(([letter, value]) => [letter, normalizeHeader(value)]),
  );

  const missingRequiredColumns = REQUIRED_FIELDS.filter(
    (field) => !headerAliases[field].some((alias) => Object.values(letterToHeader).includes(alias)),
  );

  if (missingRequiredColumns.length > 0) {
    throw new ImportError(
      `Missing required column(s): ${missingRequiredColumns.join(", ")}. Please check the header row.`,
    );
  }

  const rows: ImportRow[] = [];

  for (const parsedRow of parsedRows.slice(1)) {
    const normalized: Record<string, string> = {};

    for (const [letter, value] of Object.entries(parsedRow.values)) {
      const header = letterToHeader[letter];
      if (!header) {
        continue;
      }

      const maybeDateField = Object.entries(headerAliases).find(([, aliases]) => aliases.includes(header))?.[0];
      normalized[header] =
        maybeDateField === "requestedDate" || maybeDateField === "scheduledDate"
          ? excelSerialToIsoDate(value)
          : value.trim();
    }

    if (isBlankRow(normalized)) {
      continue;
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
          counselName: valueForAlias(normalized, "counselName") || undefined,
          counselEmail: valueForAlias(normalized, "counselEmail") || undefined,
          counselFirm: valueForAlias(normalized, "counselFirm") || undefined,
          notes: valueForAlias(normalized, "notes") || undefined,
        }),
      );
    } catch (error) {
      if (error instanceof ZodError) {
        const field = error.issues[0]?.path.join(".") || "row";
        throw new ImportError(`Row ${parsedRow.rowNumber} is invalid near "${field}". Please check that row.`);
      }

      throw error;
    }
  }

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
  if (Number.isNaN(date.getTime())) {
    return undefined;
  }

  if (date.getUTCFullYear() < 1901) {
    return undefined;
  }

  return date;
}

export function splitMultiValue(value?: string) {
  if (!value) {
    return [];
  }

  return value
    .split(";")
    .map((part) => part.trim())
    .filter(Boolean);
}
