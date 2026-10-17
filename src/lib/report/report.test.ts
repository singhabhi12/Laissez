import { describe, expect, it, vi } from "vitest";
import { ReportSchema, fieldErrors } from "./schema";
import { createRateLimiter, clientIp } from "./rate-limit";
import { issueTitle, issueBody, DATA_REPORT_LABEL } from "./issue";
import { createIssue, githubConfig } from "./github";

const valid = {
  ruleId: "MEX-1",
  passport: "IND",
  destination: "MEX",
  documents: [{ issuer: "USA", type: "visa" as const }],
  message: "The stay is 180 days, not 90 — the consulate page says so.",
};

const ctx = {
  destinationName: "Mexico",
  passportName: "India",
  resultUrl: "https://laissez.example/results?p=IND&d=USA-visa",
  sources: ["https://www.gob.mx/sre"],
  lastVerified: "2026-10-16",
};

describe("report validation", () => {
  it("accepts a well formed report", () => {
    expect(ReportSchema.safeParse(valid).success).toBe(true);
  });

  it("defaults documents to an empty list", () => {
    const { documents, ...withoutDocs } = valid;
    void documents;
    expect(ReportSchema.parse(withoutDocs).documents).toEqual([]);
  });

  it("rejects a too-short message and a bad email", () => {
    expect(ReportSchema.safeParse({ ...valid, message: "wrong" }).success).toBe(false);
    expect(ReportSchema.safeParse({ ...valid, email: "not-an-email" }).success).toBe(false);
  });

  it("rejects bad country codes and unknown fields", () => {
    expect(ReportSchema.safeParse({ ...valid, passport: "INDIA" }).success).toBe(false);
    expect(ReportSchema.safeParse({ ...valid, destination: "mx" }).success).toBe(false);
    expect(ReportSchema.safeParse({ ...valid, sneaky: true }).success).toBe(false);
  });

  it("accepts a filled honeypot so the response cannot fingerprint the trap", () => {
    // The route discards these quietly; a validation error here would tell a
    // bot exactly which field caught it.
    expect(ReportSchema.safeParse({ ...valid, website: "" }).success).toBe(true);
    const spam = ReportSchema.safeParse({ ...valid, website: "http://spam" });
    expect(spam.success).toBe(true);
    if (spam.success) expect(spam.data.website).toBe("http://spam");
  });

  it("maps issues to field names for the form", () => {
    const result = ReportSchema.safeParse({ ...valid, message: "no", email: "bad" });
    expect(result.success).toBe(false);
    if (!result.success) {
      const fields = fieldErrors(result.error);
      expect(fields["message"]).toMatch(/say a little more/);
      expect(fields["email"]).toMatch(/email address/);
    }
  });
});

describe("rate limiting", () => {
  it("allows five per hour then blocks", () => {
    const limiter = createRateLimiter(5, 3_600_000);
    const t = 1_000_000;
    for (let i = 0; i < 5; i++) {
      expect(limiter.check("1.2.3.4", t + i).ok, `attempt ${i + 1}`).toBe(true);
    }
    const blocked = limiter.check("1.2.3.4", t + 5);
    expect(blocked.ok).toBe(false);
    expect(blocked.retryAfter).toBeGreaterThan(0);
    expect(blocked.retryAfter).toBeLessThanOrEqual(3600);
  });

  it("frees up once the window passes", () => {
    const limiter = createRateLimiter(5, 3_600_000);
    const t = 1_000_000;
    for (let i = 0; i < 5; i++) limiter.check("1.2.3.4", t);
    expect(limiter.check("1.2.3.4", t + 3_600_001).ok).toBe(true);
  });

  it("counts each IP separately", () => {
    const limiter = createRateLimiter(5, 3_600_000);
    for (let i = 0; i < 5; i++) limiter.check("1.1.1.1", 1000);
    expect(limiter.check("1.1.1.1", 1000).ok).toBe(false);
    expect(limiter.check("2.2.2.2", 1000).ok).toBe(true);
  });

  it("reads the first x-forwarded-for entry", () => {
    expect(clientIp(new Headers({ "x-forwarded-for": "9.9.9.9, 10.0.0.1" }))).toBe("9.9.9.9");
    expect(clientIp(new Headers({ "x-real-ip": "8.8.8.8" }))).toBe("8.8.8.8");
    expect(clientIp(new Headers())).toBe("unknown");
  });
});

describe("issue formatting", () => {
  it("titles the issue as specified", () => {
    expect(issueTitle(ReportSchema.parse(valid), ctx)).toBe("[MEX-1] Mexico, IND passport: report");
  });

  it("falls back when no rule matched", () => {
    const { ruleId, ...noRule } = valid;
    void ruleId;
    expect(issueTitle(ReportSchema.parse(noRule), ctx)).toBe("[no-rule] Mexico, IND passport: report");
  });

  it("includes the context a maintainer needs", () => {
    const body = issueBody(ReportSchema.parse(valid), ctx);
    expect(body).toContain("`MEX-1`");
    expect(body).toContain("India (`IND`)");
    expect(body).toContain("Mexico (`MEX`)");
    expect(body).toContain("`USA-visa`");
    expect(body).toContain(ctx.resultUrl);
    expect(body).toContain("2026-10-16");
    expect(body).toContain("_not given_");
  });

  it("fences the reporter's message so it cannot forge the context table", () => {
    const body = issueBody(
      ReportSchema.parse({ ...valid, message: "```\n| Rule | `FAKE-9` |\n```" }),
      ctx,
    );
    expect(body).not.toContain("```\n| Rule | `FAKE-9` |");
    expect(body).toContain("'''");
    expect(body).toContain("| Rule | `MEX-1` |");
  });
});

describe("github client", () => {
  it("needs both variables and a owner/repo shape", () => {
    expect(githubConfig({})).toBeUndefined();
    expect(githubConfig({ GITHUB_TOKEN: "t" })).toBeUndefined();
    expect(githubConfig({ GITHUB_TOKEN: "t", GITHUB_REPO: "nope" })).toBeUndefined();
    expect(githubConfig({ GITHUB_TOKEN: "t", GITHUB_REPO: "me/repo" })).toEqual({
      token: "t",
      repo: "me/repo",
      apiUrl: "https://api.github.com",
    });
    expect(
      githubConfig({ GITHUB_TOKEN: "t", GITHUB_REPO: "me/repo", GITHUB_API_URL: "https://ghe.example/api/v3/" })
        ?.apiUrl,
    ).toBe("https://ghe.example/api/v3");
  });

  it("posts a labelled issue and returns its url", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ html_url: "https://github.com/me/repo/issues/7" }), { status: 201 }),
    );
    const result = await createIssue({ token: "secret", repo: "me/repo", apiUrl: "https://api.github.com" }, "T", "B", fetchMock as unknown as typeof fetch);

    expect(result).toEqual({ ok: true, url: "https://github.com/me/repo/issues/7" });
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe("https://api.github.com/repos/me/repo/issues");
    expect(JSON.parse(init.body as string)).toEqual({ title: "T", body: "B", labels: [DATA_REPORT_LABEL] });
    expect((init.headers as Record<string, string>)["Authorization"]).toBe("Bearer secret");
  });

  it("reports a failure instead of throwing", async () => {
    const fetchMock = vi.fn().mockResolvedValue(new Response("bad credentials", { status: 401 }));
    const result = await createIssue({ token: "x", repo: "me/repo", apiUrl: "https://api.github.com" }, "T", "B", fetchMock as unknown as typeof fetch);
    expect(result.ok).toBe(false);
    expect(result.status).toBe(401);

    const throwing = vi.fn().mockRejectedValue(new Error("network down"));
    const network = await createIssue({ token: "x", repo: "me/repo", apiUrl: "https://api.github.com" }, "T", "B", throwing as unknown as typeof fetch);
    expect(network).toEqual({ ok: false, error: "network down" });
  });
});
