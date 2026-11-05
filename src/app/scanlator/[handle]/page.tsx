import ScanlatorPublicProfile from "./ScanlatorPublicProfile";

export default async function Page({ params }: { params: Promise<{ handle: string }> }) {
  const { handle } = await params;
  return <ScanlatorPublicProfile handle={handle} />;
}
