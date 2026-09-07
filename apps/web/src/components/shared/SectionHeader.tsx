import type { ReactNode } from "react";

export function SectionHeader({
  eyebrow,
  title,
  description,
  align = "left",
}: {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "left" | "center";
}) {
  return (
    <div className={`flex flex-col gap-3 ${align === "center" ? "items-center text-center" : "items-start"}`}>
      {eyebrow && <p className="text-xs font-semibold uppercase tracking-widest text-accent">{eyebrow}</p>}
      <h2 className="text-2xl font-semibold tracking-tight text-foreground sm:text-3xl">{title}</h2>
      {description && <p className={`max-w-2xl text-base text-muted ${align === "center" ? "mx-auto" : ""}`}>{description}</p>}
    </div>
  );
}
