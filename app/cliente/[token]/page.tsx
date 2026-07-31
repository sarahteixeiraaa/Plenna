import PublicClientPortal from "@/components/portal/PublicClientPortal";

export default async function ClientPortalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <PublicClientPortal token={token}/>;
}
