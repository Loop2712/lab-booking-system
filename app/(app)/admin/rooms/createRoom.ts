type FormState = {
  roomNumber: string;
  floor: string;
  computerCount: string;
  code: string;
  name: string;
  isActive: boolean;
};

type Params = {
  form: FormState;
  setBusy: (busy: boolean) => void;
  setError: (message: string | null) => void;
  resetForm: () => void;
  refresh: () => Promise<void> | void;
};

export async function createRoom({ form, setBusy, setError, resetForm, refresh }: Params) {
  setError(null);
  setBusy(true);

  const res = await fetch("/api/admin/rooms", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      ...form,
      floor: Number(form.floor),
      computerCount: Number(form.computerCount),
    }),
  });

  const json = await res.json().catch(() => ({}));
  setBusy(false);

  if (!res.ok || !json?.ok) {
    setError(json?.message || "เพิ่มห้องไม่สำเร็จ");
    return false;
  }

  resetForm();
  await refresh();
  return true;
}
