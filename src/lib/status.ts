import type { BaseRequirement } from "./data/schema";

/**
 * Presentation for the normalised requirement codes. The five original statuses
 * keep their exact labels and colours; `no_admission` is new to the real dataset
 * and reuses the existing "required" tokens rather than introducing a colour.
 */
export const STATUS_ORDER: readonly BaseRequirement[] = [
  "visa_free",
  "eta",
  "visa_on_arrival",
  "e_visa",
  "visa_required",
  "no_admission",
];

/** The five the count cards have always shown. */
export const PRIMARY_STATUSES: readonly BaseRequirement[] = STATUS_ORDER.slice(0, 5);

export const statusLabel: Record<BaseRequirement, string> = {
  visa_free: "Visa free",
  eta: "eTA",
  visa_on_arrival: "Visa on arrival",
  e_visa: "eVisa",
  visa_required: "Visa required",
  no_admission: "No admission",
  home: "Your passport",
};

export const statusBg: Record<BaseRequirement, string> = {
  visa_free: "bg-status-free",
  eta: "bg-status-eta",
  visa_on_arrival: "bg-status-eta",
  e_visa: "bg-status-evisa",
  visa_required: "bg-status-required",
  no_admission: "bg-status-required",
  home: "bg-foreground",
};

export const statusFill: Record<BaseRequirement, string> = {
  visa_free: "var(--status-free)",
  eta: "var(--status-eta)",
  visa_on_arrival: "var(--status-eta)",
  e_visa: "var(--status-evisa)",
  visa_required: "var(--status-required)",
  no_admission: "var(--status-required)",
  home: "var(--foreground)",
};

export const confidenceText = {
  high: "Confirmed on an official government source in the last 30 days.",
  medium: "Official source exists but wording is unclear or not recently verified.",
  low: "Based on secondary sources. Double check before you travel.",
} as const;
