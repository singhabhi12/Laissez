import type { ApplyInfo, BaseRequirement } from "./data/schema";

/**
 * Statuses with nothing to apply for: visa free needs no paperwork, the home
 * country has no entry rules, and "no admission" cannot be fixed by applying.
 */
const NOTHING_TO_APPLY: ReadonlySet<BaseRequirement> = new Set(["visa_free", "home", "no_admission"]);

/** The "how to apply" entry to show for a destination, given its final status. */
export function applyInfoFor(
  status: BaseRequirement,
  info: ApplyInfo | undefined,
): ApplyInfo | undefined {
  return info && !NOTHING_TO_APPLY.has(status) ? info : undefined;
}
