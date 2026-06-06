import { clsx, type ClassValue } from "clsx";
import { extendTailwindMerge } from "tailwind-merge";

const customTwMerge = extendTailwindMerge({});

export function cn(...inputs: ClassValue[]) {
  return customTwMerge(clsx(inputs));
}

// Ensure unique ID generators for temporary logic
export function generateId() {
  return Math.random().toString(36).substring(2, 10);
}
