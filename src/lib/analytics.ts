"use client";

import { track } from "@vercel/analytics";

/**
 * The five product events. Names and payload keys are centralised so a rename
 * cannot silently split one event into two in the dashboard.
 */
export const events = {
  resultViewed: (p: { passport: string; documents: number; easyAccess: number; unlocked: number }) =>
    track("result_viewed", p),

  ruleOpened: (p: { destination: string; ruleId: string | null; status: string }) =>
    track("rule_opened", p),

  sourceClicked: (p: { destination: string; ruleId: string | null; host: string }) =>
    track("source_clicked", p),

  shareClicked: (p: { passport: string; documents: number; method: string }) =>
    track("share_clicked", p),

  nextVisaTried: (p: { passport: string; issuer: string; type: string; gained: number }) =>
    track("next_visa_tried", p),
};
