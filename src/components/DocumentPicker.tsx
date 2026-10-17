"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { AnimatePresence, motion } from "framer-motion";
import { docKey, docTypeLabel, presetDocuments, sameDoc } from "@/lib/documents";
import type { DocType } from "@/lib/data/schema";
import type { HeldDocument } from "@/lib/unlock";
import { Sheet, SheetContent, SheetHeader, SheetTitle, SheetDescription } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { PassportPicker } from "./PassportPicker";
import { useData } from "@/components/DataProvider";
import { useIsMobile } from "@/hooks/use-mobile";
import { cn } from "@/lib/utils";

export function useDocLabel() {
  const { issuerLabel } = useData();
  return (d: HeldDocument) => {
    const preset = presetDocuments.find((p) => sameDoc(p.doc, d));
    if (preset) return preset.label;
    return `${issuerLabel(d.issuer).name} ${docTypeLabel[d.type].toLowerCase()}`;
  };
}

export function DocChip({ doc, onRemove }: { doc: HeldDocument; onRemove?: () => void }) {
  const { issuerLabel } = useData();
  const label = useDocLabel()(doc);
  const { flag } = issuerLabel(doc.issuer);
  return (
    <motion.span
      layout
      initial={{ opacity: 0, scale: 0.9 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.9 }}
      className="inline-flex h-11 items-center gap-2 rounded-full bg-primary pl-4 pr-1 text-[15px] text-primary-foreground"
    >
      <span aria-hidden>{flag}</span>
      {label}
      {onRemove && (
        <button
          type="button"
          onClick={onRemove}
          aria-label={`Remove ${label}`}
          className="inline-flex size-9 items-center justify-center rounded-full hover:bg-primary-foreground/20"
        >
          <X className="size-4" aria-hidden />
        </button>
      )}
    </motion.span>
  );
}

export function AddDocumentSheet({
  open,
  onOpenChange,
  onAdd,
}: {
  open: boolean;
  onOpenChange: (o: boolean) => void;
  onAdd: (d: HeldDocument) => void;
}) {
  const isMobile = useIsMobile();
  const { countryList, groups } = useData();
  const [issuer, setIssuer] = useState<string>();
  const [type, setType] = useState<DocType>("visa");

  // Groups first, then every country in the dataset.
  const issuerOptions = [
    ...Object.keys(groups).map((code) => ({
      iso3: code,
      name: code === "GCC" ? "Gulf (GCC)" : code === "SCHENGEN" ? "Schengen" : code,
      flagEmoji: code === "GCC" ? "🌐" : "🇪🇺",
    })),
    ...countryList,
  ];

  return (
    <Sheet open={open} onOpenChange={onOpenChange}>
      <SheetContent side={isMobile ? "bottom" : "right"} className={cn("glass", isMobile && "rounded-t-[20px]")}>
        {isMobile && <div className="mx-auto mt-2 h-1.5 w-10 rounded-full bg-muted-foreground/40" aria-hidden />}
        <SheetHeader>
          <SheetTitle className="text-title">Add a document</SheetTitle>
          <SheetDescription>Pick who issued it and what kind it is.</SheetDescription>
        </SheetHeader>
        <div className="flex flex-col gap-6 px-4 pb-6">
          <div className="flex flex-col gap-2">
            <span className="text-caption text-muted-foreground">Issuing country</span>
            <PassportPicker value={issuer} onChange={setIssuer} label="Choose issuer" options={issuerOptions} />
          </div>
          <fieldset className="flex flex-col gap-2">
            <legend className="mb-2 text-caption text-muted-foreground">Type</legend>
            <div className="grid grid-cols-1 gap-1 rounded-xl bg-grouped p-1">
              {(Object.keys(docTypeLabel) as DocType[]).map((t) => (
                <button
                  key={t}
                  type="button"
                  aria-pressed={type === t}
                  onClick={() => setType(t)}
                  className={cn(
                    "h-11 rounded-lg text-[15px] transition-colors",
                    type === t ? "bg-card shadow-sm font-medium" : "text-muted-foreground",
                  )}
                >
                  {docTypeLabel[t]}
                </button>
              ))}
            </div>
          </fieldset>
          <Button
            size="lg"
            className="h-12 rounded-full text-body"
            disabled={!issuer}
            onClick={() => {
              if (!issuer) return;
              onAdd({ issuer, type });
              setIssuer(undefined);
              onOpenChange(false);
            }}
          >
            Add document
          </Button>
        </div>
      </SheetContent>
    </Sheet>
  );
}

export function DocumentPicker({
  value,
  onChange,
  showPresets = true,
}: {
  value: readonly HeldDocument[];
  onChange: (d: HeldDocument[]) => void;
  showPresets?: boolean;
}) {
  const { issuerLabel } = useData();
  const [open, setOpen] = useState(false);
  const has = (d: HeldDocument) => value.some((v) => sameDoc(v, d));
  const toggle = (d: HeldDocument) =>
    onChange(has(d) ? value.filter((v) => !sameDoc(v, d)) : [...value, d]);
  const custom = value.filter((v) => !presetDocuments.some((p) => sameDoc(p.doc, v)));

  return (
    <div className="flex flex-wrap gap-2">
      {showPresets ? (
        <>
          {presetDocuments.map((p) => {
            const on = has(p.doc);
            return (
              <button
                key={p.label}
                type="button"
                aria-pressed={on}
                onClick={() => toggle(p.doc)}
                className={cn(
                  "inline-flex h-11 items-center gap-2 rounded-full border px-4 text-[15px] transition-colors",
                  on ? "border-primary bg-primary text-primary-foreground" : "border-border bg-card hover:bg-secondary",
                )}
              >
                <span aria-hidden>{issuerLabel(p.doc.issuer).flag}</span>
                {p.label}
              </button>
            );
          })}
          <AnimatePresence>
            {custom.map((d) => (
              <DocChip key={docKey(d)} doc={d} onRemove={() => toggle(d)} />
            ))}
          </AnimatePresence>
        </>
      ) : (
        <AnimatePresence>
          {value.map((d) => (
            <DocChip key={docKey(d)} doc={d} onRemove={() => toggle(d)} />
          ))}
        </AnimatePresence>
      )}
      <button
        type="button"
        onClick={() => setOpen(true)}
        className="inline-flex h-11 items-center gap-1.5 rounded-full border border-dashed border-input px-4 text-[15px] text-link hover:bg-secondary"
      >
        <Plus className="size-4" aria-hidden />
        {showPresets ? "Add another" : "Add"}
      </button>
      <AddDocumentSheet open={open} onOpenChange={setOpen} onAdd={(d) => !has(d) && onChange([...value, d])} />
    </div>
  );
}
