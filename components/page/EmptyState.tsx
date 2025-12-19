import { ReactNode } from "react";

export default function EmptyState({
  title,
  description,
  action,
}: {
  title: string;
  description?: string;
  action?: ReactNode;
}) {
  return (
    <div className="border border-dashed rounded-2xl p-8 text-center space-y-3">
      <h3 className="font-medium">{title}</h3>
      {description ? (
        <p className="text-sm text-muted-foreground">{description}</p>
      ) : null}
      {action}
    </div>
  );
}
