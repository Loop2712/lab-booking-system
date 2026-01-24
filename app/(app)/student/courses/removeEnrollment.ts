type Params = {
  sectionId: string;
  refreshMyEnrollments: () => Promise<void> | void;
};

export async function removeEnrollment({ sectionId, refreshMyEnrollments }: Params) {
  const r = await fetch("/api/student/enrollments", {
    method: "DELETE",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ sectionId }),
  });
  const j = await r.json();
  if (!j.ok) return alert(j.message ?? "ERROR");
  await refreshMyEnrollments();
}
