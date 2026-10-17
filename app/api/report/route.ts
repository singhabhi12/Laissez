import { NextResponse, type NextRequest } from "next/server";
import { loadShared } from "@/lib/data/load.server";
import { SITE_URL } from "@/lib/landing";
import { resultsHref } from "@/lib/routes";
import { fieldErrors, ReportSchema } from "@/lib/report/schema";
import { clientIp, createRateLimiter } from "@/lib/report/rate-limit";
import { issueBody, issueTitle } from "@/lib/report/issue";
import { createIssue, githubConfig } from "@/lib/report/github";

/** 5 reports per hour per IP. See rate-limit.ts for what this does and does not cover. */
const limiter = createRateLimiter(5, 60 * 60 * 1000);

const json = (body: unknown, status: number, headers?: HeadersInit) =>
  NextResponse.json(body, headers ? { status, headers } : { status });

export async function POST(request: NextRequest) {
  let payload: unknown;
  try {
    payload = await request.json();
  } catch {
    return json({ error: "Expected a JSON body." }, 400);
  }

  const parsed = ReportSchema.safeParse(payload);
  if (!parsed.success) {
    return json({ error: "Some details need fixing.", fields: fieldErrors(parsed.error) }, 400);
  }
  const report = parsed.data;

  // Honeypot: only a bot fills this in. Answer as though it worked so the bot
  // has nothing to learn, but file nothing.
  if (report.website) {
    return json({ ok: true }, 202);
  }

  const limit = limiter.check(clientIp(request.headers));
  if (!limit.ok) {
    return json(
      { error: "You have sent several reports already. Please try again later." },
      429,
      { "Retry-After": String(limit.retryAfter) },
    );
  }

  const config = githubConfig();
  if (!config) {
    console.error("[report] GITHUB_TOKEN or GITHUB_REPO is not configured");
    return json({ error: "Reporting is not available right now." }, 503);
  }

  const shared = loadShared();
  const destination = shared.countries.countries[report.destination];
  const passport = shared.countries.countries[report.passport];
  if (!destination || !passport) {
    return json({ error: "Unknown passport or destination." }, 400);
  }

  const rule = report.ruleId
    ? shared.rules.rules.find((r) => r.id === report.ruleId)
    : undefined;

  const context = {
    destinationName: destination.name,
    passportName: passport.name,
    resultUrl: `${SITE_URL}${resultsHref({ passport: report.passport, docs: report.documents })}`,
    ...(rule ? { sources: rule.sources, lastVerified: rule.last_verified } : {}),
  };

  const result = await createIssue(
    config,
    issueTitle(report, context),
    issueBody(report, context),
  );

  if (!result.ok) {
    console.error(`[report] GitHub issue failed (${result.status ?? "network"}): ${result.error}`);
    return json({ error: "We could not file that report. Please try again." }, 502);
  }

  return json({ ok: true, url: result.url }, 201);
}

/** Anything other than POST. */
export function GET() {
  return json({ error: "Use POST." }, 405, { Allow: "POST" });
}
