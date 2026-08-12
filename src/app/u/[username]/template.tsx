import type { ReactNode } from "react";
import XPublicProfileHeader from "@/components/social/XPublicProfileHeader";
import PublicProfilePosts from "@/components/social/PublicProfilePosts";

export default async function PublicProfileTemplate({ children, params }: { children: ReactNode; params: Promise<{ username: string }> }) {
  const { username } = await params;
  const decodedUsername = decodeURIComponent(username);
  return <div className="social-profile-x pt-14 sm:pt-16">
    <XPublicProfileHeader username={decodedUsername} />
    <PublicProfilePosts username={decodedUsername} />
    <div className="legacy-profile-content">{children}</div>
    <style>{`
      .social-profile-x + aside { display:none !important }
      .social-profile-x .legacy-profile-content > .rk-page { padding-top:0 !important }
      .social-profile-x .legacy-profile-content .rk-shell > section:first-child { display:none !important }
      .social-profile-x .legacy-profile-content .rk-shell > .grid.grid-cols-3 { margin-top:0 !important; border-left:1px solid rgb(255 255 255 / .08); border-right:1px solid rgb(255 255 255 / .08); padding:16px }
      .social-profile-x .legacy-profile-content .rk-shell { max-width:42rem }
      .social-profile-x .legacy-profile-content .rk-card-soft { border-radius:16px }
      @media (max-width:639px){.social-profile-x .legacy-profile-content > .rk-page{padding-left:0;padding-right:0}.social-profile-x .legacy-profile-content .rk-shell>section:not(:first-child),.social-profile-x .legacy-profile-content .rk-shell>div:not(.grid){padding-left:12px;padding-right:12px}}
    `}</style>
  </div>;
}
