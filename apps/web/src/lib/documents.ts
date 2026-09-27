import { createHash } from "node:crypto";
import mammoth from "mammoth";
import { ApiError } from "./api";
import { env } from "./env";

function inspectDocxZip(bytes: Buffer): void {
  // Read ZIP central-directory metadata before Mammoth inflates anything.
  let end = -1;
  for (let i = bytes.length - 22; i >= Math.max(0, bytes.length - 65_557); i--) {
    if (bytes.readUInt32LE(i) === 0x06054b50) { end = i; break; }
  }
  if (end < 0) throw new ApiError(422, "invalid_docx", "The DOCX archive is invalid");
  const count = bytes.readUInt16LE(end + 10);
  const directorySize = bytes.readUInt32LE(end + 12);
  let offset = bytes.readUInt32LE(end + 16);
  if (count < 1 || count > 500 || count === 0xffff || directorySize === 0xffffffff || offset + directorySize > end) throw new ApiError(422, "invalid_docx", "The DOCX archive is too large or unsupported");
  let inflated = 0; let hasDocument = false; let hasTypes = false;
  for (let i = 0; i < count; i++) {
    if (offset + 46 > bytes.length || bytes.readUInt32LE(offset) !== 0x02014b50) throw new ApiError(422, "invalid_docx", "The DOCX archive index is invalid");
    const flags = bytes.readUInt16LE(offset + 8);
    const method = bytes.readUInt16LE(offset + 10);
    const uncompressed = bytes.readUInt32LE(offset + 24);
    const nameLength = bytes.readUInt16LE(offset + 28);
    const extraLength = bytes.readUInt16LE(offset + 30);
    const commentLength = bytes.readUInt16LE(offset + 32);
    const next = offset + 46 + nameLength + extraLength + commentLength;
    if (next > bytes.length || flags & 1 || ![0, 8].includes(method) || uncompressed > 20_000_000) throw new ApiError(422, "invalid_docx", "The DOCX archive contains unsupported or oversized content");
    const name = bytes.subarray(offset + 46, offset + 46 + nameLength).toString("utf8").toLowerCase();
    if (name.includes("vbaproject.bin")) throw new ApiError(422, "macro_document", "Macro-enabled documents are not accepted");
    hasDocument ||= name === "word/document.xml";
    hasTypes ||= name === "[content_types].xml";
    inflated += uncompressed;
    if (inflated > 40_000_000) throw new ApiError(422, "invalid_docx", "The DOCX archive expands beyond the safe limit");
    offset = next;
  }
  if (!hasDocument || !hasTypes) throw new ApiError(422, "invalid_docx", "The file is not a Word DOCX document");
}

export async function extractUpload(file: File) {
  const limit = Math.min(env().UPLOAD_MAX_MB, 10) * 1024 * 1024;
  if (file.size < 1 || file.size > limit) throw new ApiError(422, "invalid_file_size", `File must be between 1 byte and ${Math.round(limit / 1024 / 1024)} MB`);
  const bytes = Buffer.from(await file.arrayBuffer());
  const filename = file.name.slice(0, 200);
  const lower = filename.toLowerCase();
  let mimeType: string;
  let extractedText: string;
  let pageCount = 0;
  if (lower.endsWith(".txt") && !bytes.includes(0)) {
    mimeType = "text/plain";
    extractedText = bytes.toString("utf8");
  } else if (lower.endsWith(".docx") && bytes.subarray(0, 2).toString() === "PK") {
    mimeType = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";
    inspectDocxZip(bytes);
    try { extractedText = (await mammoth.extractRawText({ buffer: bytes })).value; }
    catch { throw new ApiError(422, "unreadable_document", "The DOCX could not be read; try exporting it again"); }
  } else if (lower.endsWith(".pdf") && bytes.subarray(0, 5).toString() === "%PDF-") {
    mimeType = "application/pdf";
    // Load PDF tooling only for PDFs. Its canvas globals are unavailable when
    // a Vercel function starts to process a TXT or DOCX upload.
    await import("pdf-parse/worker");
    const { PDFParse } = await import("pdf-parse");
    const parser = new PDFParse({ data: bytes });
    try {
      const info = await parser.getInfo();
      pageCount = info.total;
      if (pageCount > env().DOCUMENT_MAX_PAGES) throw new ApiError(422, "too_many_pages", `PDF exceeds ${env().DOCUMENT_MAX_PAGES} pages`);
      extractedText = (await parser.getText()).text;
    } catch (error) {
      if (error instanceof ApiError) throw error;
      throw new ApiError(422, "unreadable_document", "The PDF could not be read; it may be encrypted or damaged");
    } finally { await parser.destroy(); }
  } else {
    throw new ApiError(422, "unsupported_file", "Upload a text PDF, DOCX or TXT file");
  }
  extractedText = extractedText.replace(/\u0000/g, "").trim();
  const extractionStatus = extractedText.length < 40 ? "ocr_required" as const : "readable" as const;
  return { bytes, filename, mimeType, extractedText: extractedText.slice(0, 150_000), extractionStatus, pageCount, sha256: createHash("sha256").update(bytes).digest("hex") };
}
