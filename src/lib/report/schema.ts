import { z } from "zod";

/** A held document, as the results URL encodes it. */
const DocumentSchema = z.object({
  issuer: z.string().regex(/^[A-Z][A-Z0-9_]{1,14}$/),
  type: z.enum(["visa", "residence_permit", "permanent_residence"]),
});

export const ReportSchema = z
  .object({
    /** The rule being disputed, when the detail panel showed one. */
    ruleId: z.string().max(64).optional(),
    passport: z.string().regex(/^[A-Z]{3}$/, "expected an ISO3 passport code"),
    destination: z.string().regex(/^[A-Z]{3}$/, "expected an ISO3 destination code"),
    documents: z.array(DocumentSchema).max(20).default([]),
    message: z
      .string()
      .trim()
      .min(10, "Please say a little more about what is wrong.")
      .max(2000, "Please keep it under 2000 characters."),
    email: z.string().trim().email("That does not look like an email address.").max(200).optional(),
    /**
     * Honeypot: a real person never sees this field, so it must stay empty.
     * The schema accepts any value on purpose — rejecting it here would tell a
     * bot which field gave it away. The route checks it and quietly discards
     * the submission instead.
     */
    website: z.string().max(200).optional(),
  })
  .strict();

export type ReportInput = z.infer<typeof ReportSchema>;

/** Field-keyed messages the form can show inline. */
export function fieldErrors(error: z.ZodError): Record<string, string> {
  const out: Record<string, string> = {};
  for (const issue of error.issues) {
    const key = issue.path[0];
    if (typeof key === "string" && !out[key]) out[key] = issue.message;
  }
  return out;
}
