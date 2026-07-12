"use client";

import { useState } from "react";
import { ShareIcon } from "./icons";

type ShareButtonProps = {
  title: string;
  text?: string;
};

type ShareState = "idle" | "copied" | "failed";

export function ShareButton({ title, text }: ShareButtonProps) {
  const [state, setState] = useState<ShareState>("idle");

  function resetAfterDelay() {
    setTimeout(() => setState("idle"), 2000);
  }

  async function handleShare() {
    const url = window.location.href;
    if (navigator.share) {
      try {
        await navigator.share({ title, text, url });
      } catch {
        // User cancelled the share sheet — not an error worth surfacing.
      }
      return;
    }

    try {
      await navigator.clipboard.writeText(url);
      setState("copied");
    } catch {
      // Clipboard access can be denied by permissions policy or browser
      // settings even in a secure context — fail visibly instead of
      // leaving the button looking unresponsive.
      setState("failed");
    }
    resetAfterDelay();
  }

  const label = state === "copied" ? "Copied!" : state === "failed" ? "Couldn't copy" : "Share";

  return (
    <button
      type="button"
      onClick={handleShare}
      className="-mr-2 flex min-h-11 items-center gap-1.5 px-2 text-sm font-medium text-muted-foreground"
    >
      <ShareIcon className="h-4 w-4" />
      {label}
    </button>
  );
}
