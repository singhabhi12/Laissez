import type { ReportInput } from "./schema";

export interface IssueContext {
  /** Display name of the destination, e.g. "Mexico". */
  destinationName: string;
  /** Display name of the passport country, e.g. "India". */
  passportName: string;
  /** Absolute link back to the result the reporter was looking at. */
  resultUrl: string;
  /** The rule's sources and last-verified date, when a rule was shown. */
  sources?: readonly string[];
  lastVerified?: string;
}

export const DATA_REPORT_LABEL = "data-report";

/** "[MEX-1] Mexico, IND passport: report" */
export function issueTitle(report: ReportInput, ctx: IssueContext): string {
  const rule = report.ruleId ?? "no-rule";
  return `[${rule}] ${ctx.destinationName}, ${report.passport} passport: report`;
}

/**
 * The reporter's message is fenced rather than interpolated, so nothing they
 * type can impersonate the structured context below it.
 */
export function issueBody(report: ReportInput, ctx: IssueContext): string {
  const documents = report.documents.length
    ? report.documents.map((d) => `\`${d.issuer}-${d.type}\``).join(", ")
    : "_none_";

  const lines = [
    "### What was reported",
    "",
    "```text",
    report.message.replace(/```/g, "'''"),
    "```",
    "",
    "### Context",
    "",
    `| | |`,
    `| --- | --- |`,
    `| Rule | ${report.ruleId ? `\`${report.ruleId}\`` : "_no rule matched_"} |`,
    `| Passport | ${ctx.passportName} (\`${report.passport}\`) |`,
    `| Destination | ${ctx.destinationName} (\`${report.destination}\`) |`,
    `| Documents held | ${documents} |`,
    `| Result | ${ctx.resultUrl} |`,
  ];

  if (ctx.lastVerified) lines.push(`| Last verified | ${ctx.lastVerified} |`);
  if (ctx.sources?.length) {
    lines.push(`| Sources | ${ctx.sources.map((s) => `<${s}>`).join(" ")} |`);
  }
  lines.push(
    `| Reply to | ${report.email ? report.email : "_not given_"} |`,
    "",
    "<sub>Filed from the in-app “Report a problem” form.</sub>",
  );

  return lines.join("\n");
}
