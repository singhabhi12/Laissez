import { DATA_REPORT_LABEL } from "./issue";

export interface CreateIssueResult {
  ok: boolean;
  /** The created issue's html_url, when it succeeded. */
  url?: string;
  /** Why it failed, for the server log. Never shown to the reporter verbatim. */
  error?: string;
  status?: number;
}

export interface GithubConfig {
  token: string;
  repo: string;
  /** Defaults to https://api.github.com; set GITHUB_API_URL for GitHub Enterprise. */
  apiUrl: string;
}

/** Reads the configuration, or returns undefined when the feature is not set up. */
export function githubConfig(
  env: Record<string, string | undefined> = process.env,
): GithubConfig | undefined {
  const token = env["GITHUB_TOKEN"];
  const repo = env["GITHUB_REPO"];
  if (!token || !repo || !/^[^/\s]+\/[^/\s]+$/.test(repo)) return undefined;
  const apiUrl = (env["GITHUB_API_URL"] || "https://api.github.com").replace(/\/$/, "");
  return { token, repo, apiUrl };
}

export async function createIssue(
  config: GithubConfig,
  title: string,
  body: string,
  fetchImpl: typeof fetch = fetch,
): Promise<CreateIssueResult> {
  try {
    const response = await fetchImpl(`${config.apiUrl}/repos/${config.repo}/issues`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${config.token}`,
        Accept: "application/vnd.github+json",
        "X-GitHub-Api-Version": "2022-11-28",
        "Content-Type": "application/json",
        "User-Agent": "laissez-data-report",
      },
      body: JSON.stringify({ title, body, labels: [DATA_REPORT_LABEL] }),
    });

    if (!response.ok) {
      const detail = await response.text().catch(() => "");
      return { ok: false, status: response.status, error: detail.slice(0, 500) };
    }

    const issue = (await response.json()) as { html_url?: string };
    return { ok: true, ...(issue.html_url ? { url: issue.html_url } : {}) };
  } catch (error) {
    return { ok: false, error: error instanceof Error ? error.message : String(error) };
  }
}
