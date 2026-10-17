"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  // resolvedTheme is undefined until next-themes has read the document class,
  // so the first paint shows the light-mode icon exactly as the pre-hydration
  // markup did. No mounted flag is needed, and server and client agree.
  const dark = resolvedTheme === "dark";

  return (
    <button
      type="button"
      onClick={() => setTheme(dark ? "light" : "dark")}
      aria-label={dark ? "Switch to light mode" : "Switch to dark mode"}
      className="inline-flex size-11 items-center justify-center rounded-full text-foreground transition-colors hover:bg-secondary"
    >
      {dark ? <Sun className="size-5" /> : <Moon className="size-5" />}
    </button>
  );
}
