"use client";

import { useState } from "react";
import { CheckCircle2, Mail } from "lucide-react";
import { Button } from "@/components/ui/button";
import { CONTACT_EMAIL } from "@/lib/constants";

export function CopyEmailButton() {
  const [copied, setCopied] = useState(false);

  const handleCopyEmail = async () => {
    try {
      await navigator.clipboard.writeText(CONTACT_EMAIL);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 1800);
    } catch {
      setCopied(false);
    }
  };

  return (
    <Button
      variant="outline"
      className="w-full justify-between"
      onClick={handleCopyEmail}
    >
      <span>{copied ? "Email copied" : "Copy Email"}</span>
      {copied ? (
        <CheckCircle2 className="h-4 w-4 text-emerald-600" />
      ) : (
        <Mail className="h-4 w-4" />
      )}
    </Button>
  );
}
