"use client";

import { useState } from "react";
import { CheckCircle2, TriangleAlert } from "lucide-react";
import { Button } from "@/components/ui/button";
import type { HeldDocument } from "@/lib/unlock";

interface Props {
  ruleId?: string | undefined;
  passport: string;
  destination: string;
  destinationName: string;
  documents: readonly HeldDocument[];
}

type State =
  | { status: "idle" }
  | { status: "sending" }
  | { status: "sent"; url?: string | undefined }
  | { status: "error"; message: string; fields?: Record<string, string> };

const input =
  "h-11 w-full rounded-xl bg-card px-3 text-body outline-none placeholder:text-muted-foreground border border-border focus-visible:border-primary";

export function ReportProblem({ ruleId, passport, destination, destinationName, documents }: Props) {
  const [open, setOpen] = useState(false);
  const [message, setMessage] = useState("");
  const [email, setEmail] = useState("");
  const [website, setWebsite] = useState(""); // honeypot
  const [state, setState] = useState<State>({ status: "idle" });

  const submit = async (event: React.FormEvent) => {
    event.preventDefault();
    setState({ status: "sending" });
    try {
      const response = await fetch("/api/report", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ...(ruleId ? { ruleId } : {}),
          passport,
          destination,
          documents,
          message,
          ...(email ? { email } : {}),
          ...(website ? { website } : {}),
        }),
      });
      const body = (await response.json().catch(() => ({}))) as {
        error?: string;
        url?: string;
        fields?: Record<string, string>;
      };
      if (!response.ok) {
        setState({
          status: "error",
          message: body.error ?? "Something went wrong. Please try again.",
          ...(body.fields ? { fields: body.fields } : {}),
        });
        return;
      }
      setState({ status: "sent", url: body.url });
    } catch {
      setState({ status: "error", message: "We could not reach the server. Please try again." });
    }
  };

  if (!open) {
    return (
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="min-h-11 inline-flex items-center self-start text-link"
      >
        Report a problem
      </button>
    );
  }

  if (state.status === "sent") {
    return (
      <section className="flex items-start gap-3 rounded-xl bg-grouped p-4" aria-live="polite">
        <CheckCircle2 className="mt-0.5 size-5 text-status-free" aria-hidden />
        <div>
          <h3 className="font-semibold text-foreground">Thank you</h3>
          <p className="text-[15px] text-muted-foreground">
            Your report about {destinationName} is with us. We check every one against the official
            source.
          </p>
          {state.url && (
            <a
              href={state.url}
              target="_blank"
              rel="noreferrer"
              className="mt-1 inline-flex min-h-11 items-center text-link hover:underline"
            >
              Follow it here
            </a>
          )}
        </div>
      </section>
    );
  }

  const sending = state.status === "sending";
  const fieldError = state.status === "error" ? state.fields : undefined;

  return (
    <form onSubmit={submit} className="flex flex-col gap-3 rounded-xl bg-grouped p-4">
      <div>
        <h3 className="font-semibold text-foreground">Report a problem</h3>
        <p className="text-caption text-muted-foreground">
          About {destinationName} with {documents.length || "no"}{" "}
          {documents.length === 1 ? "document" : "documents"}
          {ruleId ? `, rule ${ruleId}` : ""}.
        </p>
      </div>

      <label className="flex flex-col gap-1.5">
        <span className="text-caption text-muted-foreground">What is wrong?</span>
        <textarea
          value={message}
          onChange={(e) => setMessage(e.target.value)}
          required
          minLength={10}
          maxLength={2000}
          rows={4}
          placeholder="The stay is 90 days, not 30 — the consulate page says so."
          className={`${input} h-auto py-2`}
          aria-invalid={!!fieldError?.["message"]}
        />
        {fieldError?.["message"] && (
          <span className="text-caption text-destructive">{fieldError["message"]}</span>
        )}
      </label>

      <label className="flex flex-col gap-1.5">
        <span className="text-caption text-muted-foreground">Email, if we may follow up</span>
        <input
          type="email"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          maxLength={200}
          placeholder="Optional"
          className={input}
          aria-invalid={!!fieldError?.["email"]}
        />
        {fieldError?.["email"] && (
          <span className="text-caption text-destructive">{fieldError["email"]}</span>
        )}
      </label>

      {/* Honeypot: hidden from people, irresistible to bots. */}
      <div aria-hidden className="hidden">
        <label>
          Website
          <input
            type="text"
            tabIndex={-1}
            autoComplete="off"
            value={website}
            onChange={(e) => setWebsite(e.target.value)}
          />
        </label>
      </div>

      {state.status === "error" && (
        <p className="flex items-start gap-2 text-[15px] text-destructive" role="alert">
          <TriangleAlert className="mt-0.5 size-4 shrink-0" aria-hidden />
          {state.message}
        </p>
      )}

      <div className="flex flex-wrap items-center gap-2">
        <Button type="submit" disabled={sending || message.trim().length < 10} className="h-11 rounded-full">
          {sending ? "Sending…" : "Send report"}
        </Button>
        <button
          type="button"
          onClick={() => setOpen(false)}
          className="inline-flex h-11 items-center rounded-full px-4 text-[15px] text-muted-foreground hover:bg-secondary"
        >
          Cancel
        </button>
      </div>
      <p className="text-caption text-muted-foreground">
        Your report is filed publicly as a data issue. Please do not include anything private.
      </p>
    </form>
  );
}
