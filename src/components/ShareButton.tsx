"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Copy, Share2 } from "lucide-react";

type ShareButtonProps = {
  title: string;
  text: string;
};

type ShareStatus = "idle" | "shared" | "copied" | "failed";

export function ShareButton({ title, text }: ShareButtonProps) {
  const [status, setStatus] = useState<ShareStatus>("idle");
  const resetTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => () => {
    if (resetTimer.current) clearTimeout(resetTimer.current);
  }, []);

  function showStatus(nextStatus: ShareStatus) {
    setStatus(nextStatus);
    if (resetTimer.current) clearTimeout(resetTimer.current);
    resetTimer.current = setTimeout(() => setStatus("idle"), 3000);
  }

  async function copyUrl(url: string) {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      return;
    }

    const input = document.createElement("textarea");
    input.value = url;
    input.setAttribute("readonly", "");
    input.style.position = "fixed";
    input.style.opacity = "0";
    document.body.appendChild(input);
    input.select();
    const copied = document.execCommand("copy");
    input.remove();
    if (!copied) throw new Error("copy failed");
  }

  async function handleShare() {
    const url = window.location.href;
    try {
      if (navigator.share) {
        await navigator.share({ title, text, url });
        showStatus("shared");
        return;
      }
      await copyUrl(url);
      showStatus("copied");
    } catch (error) {
      if (error instanceof DOMException && error.name === "AbortError") return;
      showStatus("failed");
    }
  }

  const label = status === "shared"
    ? "共有しました"
    : status === "copied"
      ? "URLをコピーしました"
      : status === "failed"
        ? "コピーできませんでした"
        : "この項目を共有";

  return (
    <div className="share-control">
      <button type="button" className="share-button" onClick={handleShare}>
        {status === "shared" || status === "copied"
          ? <Check size={15} aria-hidden="true" />
          : status === "failed"
            ? <Copy size={15} aria-hidden="true" />
            : <Share2 size={15} aria-hidden="true" />}
        <span>{label}</span>
      </button>
      <span className="sr-only" aria-live="polite">
        {status === "idle" ? "" : label}
      </span>
    </div>
  );
}
