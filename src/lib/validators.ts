export const isValidEmail = (value: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());

/** Angolan mobile: 9 digits starting with 9, optional +244 / 244 prefix. */
export const isAngolanPhone = (value: string) => /^(?:\+?244)?9\d{8}$/.test(value.replace(/[\s()-]/g, ""));

export const isAllowedImage = (file: File, maxMb: number) =>
  ["image/jpeg", "image/png", "image/webp", "image/gif"].includes(file.type) && file.size <= maxMb * 1024 * 1024;
