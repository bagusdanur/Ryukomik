import PremiumPageClient from "./PremiumPageClient";

export const dynamic = "force-dynamic";
export const revalidate = 0;

export default function PremiumPage() {
  return <PremiumPageClient />;
}
