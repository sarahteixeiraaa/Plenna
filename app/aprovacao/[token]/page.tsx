import PublicContentApproval from "@/components/approvals/PublicContentApproval";

export default async function ApprovalPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <PublicContentApproval token={token}/>;
}
