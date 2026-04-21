import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";
import { parse, differenceInMinutes } from "date-fns";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

export function calculateDuration(checkIn: string | null, checkOut: string | null): number {
  if (!checkIn || !checkOut) return 0;
  try {
    const start = parse(checkIn, "HH:mm", new Date());
    const end = parse(checkOut, "HH:mm", new Date());
    const minutes = differenceInMinutes(end, start);
    return Math.max(0, minutes / 60);
  } catch (e) {
    return 0;
  }
}

export function formatDuration(hours: number): string {
  const h = Math.floor(hours);
  const m = Math.round((hours - h) * 60);
  if (h === 0) return `${m}m`;
  if (m === 0) return `${h}h`;
  return `${h}h ${m}m`;
}
