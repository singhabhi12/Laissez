"use client";

import { useTheme } from "next-themes";
import { Moon, Sun } from "lucide-react";

/**
 * The icon and label are chosen by CSS, not by React state.
 *
 * next-themes reads the stored theme and the OS preference synchronously on the
 * client, which the server cannot know, so rendering from `resolvedTheme`
 * produced different markup on each side for every dark-mode visitor and threw
 * away the server HTML. Its blocking script puts `.dark` on <html> before first
 * paint, so `dark:` variants pick the right icon and accessible name at once:
 * identical markup on server and client, and no flash.
 */
export function ThemeToggle() {
  const { resolvedTheme, setTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}
      className="inline-flex size-11 items-center justify-center rounded-full text-foreground transition-colors hover:bg-secondary"
    >
      <Moon className="size-5 dark:hidden" aria-hidden />
      <Sun className="hidden size-5 dark:block" aria-hidden />
      {/* Exactly one of these is exposed as the button's accessible name. */}
      <span className="sr-only dark:hidden">Switch to dark mode</span>
      <span className="hidden dark:inline dark:sr-only">Switch to light mode</span>
    </button>
  );
}
