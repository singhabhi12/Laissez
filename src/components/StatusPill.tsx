import { Ban, Check, Clock, FileText, Plane, X, Sparkles } from "lucide-react";
import type { BaseRequirement } from "@/lib/data/schema";
import { statusBg, statusLabel } from "@/lib/status";
import { cn } from "@/lib/utils";

export { statusBg, statusFill, statusLabel } from "@/lib/status";

const icons: Record<BaseRequirement, typeof Check> = {
  visa_free: Check,
  eta: Clock,
  visa_on_arrival: Plane,
  e_visa: FileText,
  visa_required: X,
  no_admission: Ban,
  home: Check,
};

export function StatusIcon({ status, className }: { status: BaseRequirement; className?: string }) {
  const Icon = icons[status];
  return <Icon className={className} aria-hidden />;
}

export function StatusPill({ status, className }: { status: BaseRequirement; className?: string }) {
  const muted = status === "visa_required" || status === "no_admission";
  return (
    <span
      className={cn(
        "inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2.5 py-1 text-caption font-medium",
        muted ? "bg-status-required text-foreground" : `${statusBg[status]} text-status-ink`,
        className,
      )}
    >
      <StatusIcon status={status} className="size-3.5" />
      {statusLabel[status]}
    </span>
  );
}

export function UnlockedTag() {
  return (
    <span className="inline-flex items-center gap-1 rounded-full bg-link/12 px-2 py-0.5 text-caption font-medium text-link">
      <Sparkles className="size-3" aria-hidden />
      Unlocked
    </span>
  );
}
