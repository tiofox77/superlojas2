import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

/** "1 produto" / "3 produtos" — counts in the UI read "1 produtos" before (QA 17-Out). */
export function plural(n: number | null | undefined, one: string, many: string) {
  const v = Number(n) || 0;
  return `${v} ${v === 1 ? one : many}`;
}
