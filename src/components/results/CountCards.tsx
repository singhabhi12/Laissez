"use client";

import { AnimatedNumber } from "@/components/AnimatedNumber";
import { StatusIcon, statusBg } from "@/components/StatusPill";
import { PRIMARY_STATUSES, statusLabel } from "@/lib/status";
import type { TravelPower } from "@/lib/unlock";

export function CountCards({ power }: { power: TravelPower }) {
  // The design shows five cards; "No admission" only exists for some passports,
  // so its card appears only when that passport actually has any.
  const showNoAdmission = power.counts.no_admission.withDocs > 0 || power.counts.no_admission.base > 0;
  const statuses = showNoAdmission ? [...PRIMARY_STATUSES, "no_admission" as const] : PRIMARY_STATUSES;

  return (
    <div
      className={`no-scrollbar -mx-4 flex snap-x gap-3 overflow-x-auto px-4 sm:mx-0 sm:px-0 ${
        showNoAdmission ? "sm:grid sm:grid-cols-6" : "sm:grid sm:grid-cols-5"
      }`}
    >
      {statuses.map((s) => {
        const c = power.counts[s];
        const delta = c.withDocs - c.base;
        return (
          <div key={s} className="min-w-[140px] snap-start rounded-xl bg-grouped p-4">
            <div className="flex items-center gap-2 text-caption text-muted-foreground">
              <span className={`inline-flex size-5 items-center justify-center rounded-full ${statusBg[s]} text-status-ink`}>
                <StatusIcon status={s} className="size-3" />
              </span>
              {statusLabel[s]}
            </div>
            <div className="mt-2 text-title">
              <AnimatedNumber value={c.withDocs} />
            </div>
            <div className="tnum text-caption text-muted-foreground" aria-label={`Change from documents: ${delta}`}>
              {delta === 0 ? "No change" : (
                <span className={delta > 0 && s !== "visa_required" && s !== "no_admission" ? "text-link" : ""}>
                  {delta > 0 ? `+${delta}` : delta} from documents
                </span>
              )}
            </div>
          </div>
        );
      })}
    </div>
  );
}
