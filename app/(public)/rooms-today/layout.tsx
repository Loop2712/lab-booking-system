import type { ReactNode } from "react";

export default function RoomsTodayLayout({ children }: { children: ReactNode }) {
  return <div className="min-h-screen py-8 sm:py-12">{children}</div>;
}
