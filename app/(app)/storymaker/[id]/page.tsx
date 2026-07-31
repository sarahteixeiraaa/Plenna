import CoverageMode from "@/components/storymaker/CoverageMode";

export default async function CoveragePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <CoverageMode coverageId={id}/>;
}
