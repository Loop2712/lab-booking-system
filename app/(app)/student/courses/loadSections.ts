import type { SectionItem } from "./types";

type Params = {
  setSections: (items: SectionItem[]) => void;
};

export async function loadSections({ setSections }: Params) {
  const r = await fetch("/api/student/sections");
  const j = await r.json();
  setSections(j.items ?? []);
}
