type Params = {
  selectedSectionId: string;
  setSelectedSectionId: (value: string) => void;
  refreshMyEnrollments: () => Promise<void> | void;
};

export async function addEnrollment({
  selectedSectionId,
  setSelectedSectionId,
  refreshMyEnrollments,
}: Params) {
  if (!selectedSectionId) return;

  const r = await fetch("/api/student/enrollments", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sectionId: selectedSectionId }),
  });
  const j = await r.json();
  if (!j.ok) {
    if (j.message === "SECTION_FULL") {
      return alert("เต็มแล้ว (สูงสุด 40 คน)");
    }
    return alert(j.message ?? "ERROR");
  }

  setSelectedSectionId("");
  await refreshMyEnrollments();
}
