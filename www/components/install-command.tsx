"use client";

import { Check, Copy } from "lucide-react";
import { useState } from "react";

export function InstallCommand({ command }: { command: string }) {
  const [copied, setCopied] = useState(false);

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(command);
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    } catch {
      // clipboard blocked: the command stays selectable
    }
  };

  return (
    <div className="group flex items-center gap-3 rounded-xl border bg-fd-card/80 py-2 pr-2 pl-4 font-mono text-sm shadow-sm backdrop-blur">
      <span className="select-none text-brand">$</span>
      <code className="select-all">{command}</code>
      <button
        type="button"
        onClick={copy}
        aria-label={copied ? "Copied" : "Copy install command"}
        className="ml-1 rounded-lg p-1.5 text-fd-muted-foreground transition-colors hover:bg-fd-accent hover:text-fd-accent-foreground"
      >
        {copied ? <Check className="size-4 text-brand-2" /> : <Copy className="size-4" />}
      </button>
    </div>
  );
}
