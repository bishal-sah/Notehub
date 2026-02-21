import { type ClassValue, clsx } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

/**
 * Converts an absolute backend media URL to a relative path
 * so the Vite dev proxy serves it correctly.
 * e.g. "http://localhost:8000/media/notes/file.pdf" → "/media/notes/file.pdf"
 */
export function mediaUrl(url: string | null | undefined): string {
  if (!url) return '';
  try {
    const parsed = new URL(url);
    return parsed.pathname;
  } catch {
    // Already a relative path
    return url;
  }
}
