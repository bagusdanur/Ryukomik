import type { ReactNode } from "react";
import PublicProfileSocialBar from "@/components/social/PublicProfileSocialBar";

export default async function PublicUserLayout({ children, params }: { children: ReactNode; params: Promise<{ username: string }> }) {
  const { username } = await params;
  return <>{children}<PublicProfileSocialBar username={decodeURIComponent(username)} /></>;
}
