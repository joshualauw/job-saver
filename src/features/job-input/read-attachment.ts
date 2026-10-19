import { appConfig } from "@/config/app";
import type { MediaAttachment } from "@/core/types";

export type ReadResult<T> = { readonly ok: true; readonly value: T } | { readonly ok: false; readonly message: string };

/** An image that has been read, with an ID so the list can remove it. */
export interface ImageItem extends MediaAttachment {
  readonly id: string;
}

/** What the File tab holds: a text file already decoded, or a PDF ready to send. */
export type PickedFile =
  | { readonly kind: "text"; readonly name: string; readonly size: number; readonly text: string }
  | { readonly kind: "media"; readonly name: string; readonly size: number; readonly item: MediaAttachment };

const IMAGE_TYPES: readonly string[] = ["image/png", "image/jpeg", "image/webp", "image/gif"];
const PDF_TYPE = "application/pdf";
const TEXT_EXTENSIONS = [".txt", ".md", ".markdown"];

export const IMAGE_ACCEPT = IMAGE_TYPES.join(",");
export const FILE_ACCEPT = [...TEXT_EXTENSIONS, ".pdf", "text/plain", "text/markdown", PDF_TYPE].join(",");

const MB = 1024 * 1024;
let nextId = 0;

function hasExtension(file: File, extensions: readonly string[]): boolean {
  const name = file.name.toLowerCase();
  return extensions.some((extension) => name.endsWith(extension));
}

function isPdf(file: File): boolean {
  return file.type === PDF_TYPE || hasExtension(file, [".pdf"]);
}

function isTextFile(file: File): boolean {
  return file.type === "text/plain" || file.type === "text/markdown" || hasExtension(file, TEXT_EXTENSIONS);
}

/** Base64 data URL for a file; works the same in the browser and in tests. */
async function toDataUrl(file: File, mimeType: string): Promise<string> {
  const bytes = new Uint8Array(await file.arrayBuffer());
  let binary = "";
  const chunk = 0x8000;
  for (let offset = 0; offset < bytes.length; offset += chunk) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunk));
  }
  return `data:${mimeType};base64,${btoa(binary)}`;
}

function tooBig(file: File, limit: number): string {
  return `${file.name} is larger than ${Math.round(limit / MB)} MB.`;
}

export async function readImage(file: File): Promise<ReadResult<ImageItem>> {
  if (!IMAGE_TYPES.includes(file.type)) return { ok: false, message: `${file.name} is not a PNG, JPEG, WebP or GIF image.` };
  if (file.size > appConfig.maxImageBytes) return { ok: false, message: tooBig(file, appConfig.maxImageBytes) };
  nextId += 1;
  return {
    ok: true,
    value: { id: `image-${nextId}`, name: file.name, mimeType: file.type, dataUrl: await toDataUrl(file, file.type) },
  };
}

export interface ReadImagesResult {
  readonly items: ImageItem[];
  readonly errors: string[];
}

/** Reads as many images as there is room for, and reports each one it could not take. */
export async function readImages(files: readonly File[], slots: number): Promise<ReadImagesResult> {
  const items: ImageItem[] = [];
  const errors: string[] = [];
  for (const file of files) {
    if (items.length >= slots) {
      errors.push(`Only ${appConfig.maxImages} images fit at once; ${file.name} was left out.`);
      continue;
    }
    const result = await readImage(file);
    if (result.ok) items.push(result.value);
    else errors.push(result.message);
  }
  return { items, errors };
}

export async function readJobFile(file: File): Promise<ReadResult<PickedFile>> {
  if (file.size > appConfig.maxFileBytes) return { ok: false, message: tooBig(file, appConfig.maxFileBytes) };

  if (isPdf(file)) {
    const item = { name: file.name, mimeType: PDF_TYPE, dataUrl: await toDataUrl(file, PDF_TYPE) };
    return { ok: true, value: { kind: "media", name: file.name, size: file.size, item } };
  }
  if (isTextFile(file)) {
    return { ok: true, value: { kind: "text", name: file.name, size: file.size, text: await file.text() } };
  }
  return { ok: false, message: `${file.name} is not a PDF, .txt or .md file.` };
}
