"use client";

import { FiDownload } from "react-icons/fi";

type ApkDownloadButtonProps = {
  downloadUrl: string;
};

export default function ApkDownloadButton({ downloadUrl }: ApkDownloadButtonProps) {
  return (
    <a
      className="rk-btn-primary inline-flex h-11 w-full items-center justify-center gap-2 rounded-full px-7 text-sm font-black sm:w-auto"
      href={downloadUrl}
      rel="noopener noreferrer"
    >
      <FiDownload aria-hidden="true" className="h-5 w-5" />
      Download APK
    </a>
  );
}
