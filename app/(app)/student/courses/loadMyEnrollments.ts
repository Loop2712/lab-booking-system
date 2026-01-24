type Params = {
  setMyEnrollments: (items: any[]) => void;
};

export async function loadMyEnrollments({ setMyEnrollments }: Params) {
  const r = await fetch("/api/student/enrollments");
  const j = await r.json();
  setMyEnrollments(j.items ?? []);
}
