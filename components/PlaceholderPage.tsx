import Link from "next/link";

export default function PlaceholderPage({
  title,
  description,
  backHref,
  backLabel,
}: {
  title: string;
  description?: string;
  backHref?: string;
  backLabel?: string;
}) {
  return (
    <div className="space-y-3">
      <h1 className="text-2xl font-semibold">{title}</h1>
      {description && <p className="text-sm text-muted-foreground">{description}</p>}

      <div className="rounded-xl border p-4 text-sm text-muted-foreground">
        หน้านี้ยังอยู่ระหว่างพัฒนา (Placeholder)
      </div>

      {backHref && (
        <Link className="inline-block text-sm underline" href={backHref}>
          {backLabel ?? "ย้อนกลับ"}
        </Link>
      )}
    </div>
  );
}
