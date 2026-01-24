import type { UIEvent as CalendarEvent } from "./types";

export function chipClass(kind: CalendarEvent["kind"]) {
  if (kind === "CLASS") return "bg-blue-100 text-blue-700 border-blue-200";
  if (kind === "IN_CLASS") return "bg-green-100 text-green-700 border-green-200";
  return "bg-purple-100 text-purple-700 border-purple-200";
}
