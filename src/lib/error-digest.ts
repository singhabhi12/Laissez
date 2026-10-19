/**
 * Next forwards server errors with a generic message plus a `digest` that
 * matches the server log. A thrown value may not be an Error at all, so narrow
 * before reading it.
 */
export function errorDigest(error: unknown): string | undefined {
  if (error instanceof Error && "digest" in error && typeof error.digest === "string") {
    return error.digest;
  }
  return undefined;
}
