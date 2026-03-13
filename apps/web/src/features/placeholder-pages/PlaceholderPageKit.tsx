import type { ReactNode } from "react";

import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";

type Tone = "default" | "info" | "success" | "warning" | "danger";

const toneClasses: Record<Tone, string> = {
  default: "border-white/10 bg-white/5 text-foreground",
  info: "border-sky-500/30 bg-sky-500/10 text-sky-200",
  success: "border-emerald-500/30 bg-emerald-500/10 text-emerald-200",
  warning: "border-amber-500/30 bg-amber-500/10 text-amber-200",
  danger: "border-rose-500/30 bg-rose-500/10 text-rose-200",
};

const meterClasses: Record<Tone, string> = {
  default: "bg-slate-400",
  info: "bg-sky-400",
  success: "bg-emerald-400",
  warning: "bg-amber-400",
  danger: "bg-rose-400",
};

export function ToneBadge({
  children,
  tone = "default",
  className,
}: {
  children: ReactNode;
  tone?: Tone;
  className?: string;
}) {
  return (
    <Badge variant="outline" className={cn("px-2.5 py-1 text-xs font-medium", toneClasses[tone], className)}>
      {children}
    </Badge>
  );
}

export function ScenarioHero({
  eyebrow,
  title,
  description,
  tags,
  stats,
}: {
  eyebrow: string;
  title: string;
  description: string;
  tags: string[];
  stats: Array<{ label: string; value: string; tone?: Tone }>;
}) {
  return (
    <section className="tech-card overflow-hidden border border-primary/20 bg-gradient-to-br from-card via-card to-primary/10">
      <div className="grid gap-6 p-6 xl:grid-cols-[1.4fr,1fr]">
        <div className="space-y-4">
          <ToneBadge tone="info">{eyebrow}</ToneBadge>
          <div className="space-y-3">
            <h2 className="text-2xl font-semibold tracking-tight">{title}</h2>
            <p className="max-w-3xl text-sm leading-6 text-muted-foreground">{description}</p>
          </div>
          <div className="flex flex-wrap gap-2">
            {tags.map((tag) => (
              <ToneBadge key={tag}>{tag}</ToneBadge>
            ))}
          </div>
        </div>

        <div className="grid gap-3 sm:grid-cols-2">
          {stats.map((item) => (
            <div key={item.label} className="rounded-2xl border border-border/60 bg-background/55 p-4 backdrop-blur-sm">
              <div className="text-xs uppercase tracking-[0.18em] text-muted-foreground">{item.label}</div>
              <div className="mt-2 flex items-center gap-3">
                <div className="text-2xl font-semibold">{item.value}</div>
                {item.tone ? <ToneBadge tone={item.tone}>{item.tone === "danger" ? "Atenção" : "Controle"}</ToneBadge> : null}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

export function PanelCard({
  title,
  description,
  children,
  className,
}: {
  title: string;
  description?: string;
  children: ReactNode;
  className?: string;
}) {
  return (
    <section className={cn("tech-card p-6", className)}>
      <div className="mb-5 space-y-1">
        <h3 className="text-lg font-semibold">{title}</h3>
        {description ? <p className="text-sm text-muted-foreground">{description}</p> : null}
      </div>
      {children}
    </section>
  );
}

export function ProcessRail({
  steps,
}: {
  steps: ReadonlyArray<{ title: string; detail: string; metric: string }>;
}) {
  return (
    <div className="grid gap-3">
      {steps.map((step, index) => (
        <div key={step.title} className="rounded-2xl border border-border/60 bg-background/40 p-4">
          <div className="flex items-center justify-between gap-3">
            <div className="flex items-center gap-3">
              <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/15 text-sm font-semibold text-primary">
                {index + 1}
              </div>
              <div>
                <div className="font-medium">{step.title}</div>
                <div className="text-sm text-muted-foreground">{step.detail}</div>
              </div>
            </div>
            <ToneBadge tone="info" className="shrink-0">
              {step.metric}
            </ToneBadge>
          </div>
        </div>
      ))}
    </div>
  );
}

export function MetricBarList({
  items,
}: {
  items: Array<{
    label: string;
    value: number;
    helper?: string;
    valueLabel?: string;
    tone?: Tone;
  }>;
}) {
  return (
    <div className="space-y-4">
      {items.map((item) => {
        const width = Math.max(6, Math.min(100, item.value));
        const tone = item.tone ?? "info";

        return (
          <div key={item.label} className="space-y-2">
            <div className="flex items-center justify-between gap-3">
              <div>
                <div className="text-sm font-medium">{item.label}</div>
                {item.helper ? <div className="text-xs text-muted-foreground">{item.helper}</div> : null}
              </div>
              <div className="text-sm font-semibold">{item.valueLabel ?? `${Math.round(item.value)}%`}</div>
            </div>
            <div className="h-2.5 rounded-full bg-muted/70">
              <div className={cn("h-2.5 rounded-full", meterClasses[tone])} style={{ width: `${width}%` }} />
            </div>
          </div>
        );
      })}
    </div>
  );
}
