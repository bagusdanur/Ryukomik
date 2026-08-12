import type { ReactNode } from "react";
import SocialDock from "@/components/social/SocialDock";

export default function AppTemplate({ children }: { children: ReactNode }) { return <>{children}<SocialDock /></>; }
