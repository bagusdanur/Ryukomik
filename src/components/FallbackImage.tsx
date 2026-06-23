"use client";

import { useMemo, useState } from "react";
import type { HTMLAttributeReferrerPolicy } from "react";
import Image from "next/image";

type FallbackImageProps = {
  src?: string;
  candidates?: string[];
  alt: string;
  className?: string;
  loading?: "eager" | "lazy";
  fetchPriority?: "high" | "low" | "auto";
  decoding?: "async" | "sync" | "auto";
  sizes?: string;
  referrerPolicy?: HTMLAttributeReferrerPolicy;
};

function uniqueUrls(urls: Array<string | undefined>) {
  return urls.filter((url, index, array): url is string => {
    return Boolean(url) && array.indexOf(url) === index;
  });
}

function joinClassNames(...classes: Array<string | undefined>) {
  return classes.filter(Boolean).join(" ");
}

export default function FallbackImage({
  src,
  candidates,
  alt,
  className,
  loading,
  fetchPriority,
  decoding,
  sizes,
  referrerPolicy,
}: FallbackImageProps) {
  const urls = useMemo(() => uniqueUrls([...(candidates || []), src]), [candidates, src]);
  const urlsKey = urls.join("\n");
  const [status, setStatus] = useState({ key: urlsKey, index: 0, failed: false });
  const index = status.key === urlsKey ? status.index : 0;
  const failed = status.key === urlsKey ? status.failed : false;
  const activeSrc = urls[index] || "";

  if (!activeSrc || failed) {
    return (
      <div
        role="img"
        aria-label={alt}
        className={joinClassNames(
          "flex h-full w-full items-center justify-center bg-[color:color-mix(in_srgb,var(--surface-2)_72%,black)] px-2 text-center text-[10px] font-bold uppercase tracking-wide text-white/28",
          className,
        )}
      >
        No Image
      </div>
    );
  }

  return (
    <Image
      referrerPolicy={referrerPolicy}
      priority={loading === "eager"}
      src={activeSrc}
      alt={alt}
      sizes={sizes || "(max-width: 640px) 32vw, (max-width: 1024px) 20vw, 160px"}
      className={className}
      fill
      style={{ objectFit: "cover" }}
      unoptimized={activeSrc.startsWith("/api/")}
      onError={() => {
        setStatus((current) => {
          const currentIndex = current.key === urlsKey ? current.index : 0;
          const next = currentIndex + 1;
          if (next < urls.length) return { key: urlsKey, index: next, failed: false };
          return { key: urlsKey, index: currentIndex, failed: true };
        });
      }}
    />
  );
}
