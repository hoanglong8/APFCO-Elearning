"use client";

import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Copy, Check } from "lucide-react";

interface Props {
  prompt?: string;
  url?: string;
  label?: string;
}

export function PromptCopyButton({ prompt, url, label = "Copy Prompt" }: Props) {
  const [copied, setCopied] = useState(false);

  async function handleCopy() {
    let text = prompt;
    if (!text && url) {
      const res = await fetch(url);
      text = await res.text();
    }
    if (!text) return;
    await navigator.clipboard.writeText(text);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  }

  return (
    <Button
      variant="outline"
      size="sm"
      onClick={handleCopy}
      className={`gap-1 h-8 transition-colors ${copied ? "text-green-600 border-green-300" : ""}`}
    >
      {copied ? <Check className="w-3 h-3" /> : <Copy className="w-3 h-3" />}
      {copied ? "Đã copy!" : label}
    </Button>
  );
}
