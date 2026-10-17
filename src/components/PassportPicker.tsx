"use client";

import { useId, useMemo, useState } from "react";
import { ChevronsUpDown, Check } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Command, CommandEmpty, CommandGroup, CommandInput, CommandItem, CommandList } from "@/components/ui/command";
import { useData } from "@/components/DataProvider";
import { cn } from "@/lib/utils";

export interface PickerOption {
  iso3: string;
  name: string;
  flagEmoji: string;
}

interface Props {
  value?: string | undefined;
  onChange: (iso3: string) => void;
  compact?: boolean;
  label?: string;
  options?: PickerOption[];
}

export function PassportPicker({ value, onChange, compact, label = "Choose your passport", options }: Props) {
  const { countryList, country } = useData();
  const [open, setOpen] = useState(false);
  const listId = useId();
  const selected = value ? (options?.find((o) => o.iso3 === value) ?? country(value)) : undefined;
  const list = options ?? countryList;

  // Searchable by name and by code: cmdk matches against `value`, so both go in.
  const items = useMemo(
    () => list.map((c) => ({ ...c, search: `${c.name} ${c.iso3}` })),
    [list],
  );

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <button
          type="button"
          role="combobox"
          aria-expanded={open}
          aria-controls={listId}
          aria-label={selected ? `Passport: ${selected.name}. Change` : label}
          className={cn(
            "flex items-center justify-between gap-2 border border-border bg-card text-left transition-colors hover:bg-secondary",
            compact ? "h-11 rounded-full px-4 text-[15px]" : "h-14 w-full rounded-xl px-4 text-body",
          )}
        >
          <span className="flex items-center gap-2 truncate">
            {selected ? (
              <>
                <span aria-hidden className="text-xl">{selected.flagEmoji}</span>
                <span className="truncate">{selected.name}</span>
              </>
            ) : (
              <span className="text-muted-foreground">{label}</span>
            )}
          </span>
          <ChevronsUpDown className="size-4 shrink-0 text-muted-foreground" aria-hidden />
        </button>
      </PopoverTrigger>
      <PopoverContent id={listId} className="w-[--radix-popover-trigger-width] min-w-[280px] rounded-xl p-0 shadow-float" align="start">
        <Command>
          <CommandInput placeholder="Search countries" />
          <CommandList>
            <CommandEmpty>No country found.</CommandEmpty>
            <CommandGroup>
              {items.map((c) => (
                <CommandItem
                  key={c.iso3}
                  value={c.search}
                  onSelect={() => {
                    onChange(c.iso3);
                    setOpen(false);
                  }}
                  className="min-h-11"
                >
                  <span aria-hidden className="text-lg">{c.flagEmoji}</span>
                  <span>{c.name}</span>
                  <span className="tnum ml-auto text-caption text-muted-foreground">{c.iso3}</span>
                  {value === c.iso3 && <Check className="ml-1 size-4 text-link" aria-hidden />}
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  );
}
