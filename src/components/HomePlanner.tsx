"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { PassportPicker } from "@/components/PassportPicker";
import { DocumentPicker } from "@/components/DocumentPicker";
import { useStoredPassport } from "@/lib/use-stored-passport";
import type { HeldDocument } from "@/lib/unlock";
import { resultsHref } from "@/lib/routes";

export function HomePlanner() {
  const router = useRouter();
  const [stored, remember] = useStoredPassport();
  const [chosen, setChosen] = useState<string>();
  const [docs, setDocs] = useState<HeldDocument[]>([]);

  // Falls back to the last passport this visitor picked.
  const passport = chosen ?? stored ?? undefined;

  return (
    <section className="mx-auto flex max-w-3xl flex-col gap-10 rounded-[20px] bg-grouped p-6 sm:p-10">
      <div className="flex flex-col gap-3">
        <h2 className="text-caption uppercase tracking-wide text-muted-foreground">Step 1</h2>
        <p className="text-title">Your passport</p>
        <PassportPicker
          value={passport}
          onChange={(iso3) => {
            setChosen(iso3);
            remember(iso3);
          }}
        />
      </div>
      <div className="flex flex-col gap-3">
        <h2 className="text-caption uppercase tracking-wide text-muted-foreground">Step 2</h2>
        <p className="text-title">Documents you hold</p>
        <DocumentPicker value={docs} onChange={setDocs} />
      </div>
      <Button
        size="lg"
        disabled={!passport}
        onClick={() => passport && router.push(resultsHref({ passport, docs }))}
        className="h-14 rounded-full text-body"
      >
        Show my travel power
      </Button>
    </section>
  );
}
