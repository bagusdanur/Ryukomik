import { Suspense } from "react";
import FilesClient from "./FilesClient";

export const dynamic = "force-static";

export default function FilesPage() {
  return (
    <Suspense
      fallback={
        <div className="text-center mt-20 text-white/60">Loading files...</div>
      }
    >
      <FilesClient />
    </Suspense>
  );
}
