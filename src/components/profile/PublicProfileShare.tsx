"use client";

import { useState } from "react";
import { FiCheck, FiCopy, FiShare2 } from "react-icons/fi";

async function copyText(text) {
  if (navigator.clipboard && window.isSecureContext) {
    await navigator.clipboard.writeText(text);
    return true;
  }

  const textarea = document.createElement("textarea");
  textarea.value = text;
  textarea.setAttribute("readonly", "");
  textarea.style.position = "fixed";
  textarea.style.left = "-9999px";
  textarea.style.top = "0";
  document.body.appendChild(textarea);
  textarea.focus();
  textarea.select();

  const ok = document.execCommand("copy");
  document.body.removeChild(textarea);
  return ok;
}

export default function PublicProfileShare({ username }) {
  const [status, setStatus] = useState("idle");

  function showStatus(nextStatus) {
    setStatus(nextStatus);
    setTimeout(() => setStatus("idle"), 1800);
  }

  async function shareProfile() {
    const url = `${window.location.origin}/u/${encodeURIComponent(username)}`;

    try {
      if (navigator.share) {
        await navigator.share({
          title: `${username} - Ryukomik`,
          url,
        });
        showStatus("shared");
        return;
      }
    } catch (error) {
      if (error.name === "AbortError") return;
    }

    try {
      const copied = await copyText(url);
      showStatus(copied ? "copied" : "error");
    } catch {
      showStatus("error");
    }
  }

  const isDone = status === "copied" || status === "shared";
  const label =
    status === "shared"
      ? "Profil Dibagikan"
      : status === "copied"
        ? "Link Disalin"
        : status === "error"
          ? "Gagal Salin"
          : "Share Profil";

  return (
    <button
      type="button"
      onClick={shareProfile}
      className="rk-btn-ghost mx-auto mt-5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-xs font-bold"
    >
      {isDone ? <FiCheck /> : status === "error" ? <FiCopy /> : <FiShare2 />}
      {label}
    </button>
  );
}
