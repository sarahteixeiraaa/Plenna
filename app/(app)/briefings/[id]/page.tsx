import BriefingWorkspace from "@/components/briefings/BriefingWorkspace";

export default async function BriefingWorkspacePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <BriefingWorkspace briefingId={id}/>;
}
