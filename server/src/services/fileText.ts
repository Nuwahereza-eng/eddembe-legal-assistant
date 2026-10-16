import mammoth from "mammoth";
import { extractText } from "unpdf";

export const PDF = "application/pdf";
export const DOCX = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

// Text from a PDF or Word file. Scanned PDFs have no text layer and return "".
export async function fileToText(mimeType: string, data: Buffer): Promise<string> {
  if (mimeType === PDF) {
    const { text } = await extractText(new Uint8Array(data), { mergePages: true });
    return text.trim();
  }
  if (mimeType === DOCX) {
    const { value } = await mammoth.extractRawText({ buffer: data });
    return value.trim();
  }
  throw new Error(`Unsupported file type: ${mimeType}`);
}
