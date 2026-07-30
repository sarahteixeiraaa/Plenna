import PublicBriefingForm from "@/components/briefings/PublicBriefingForm";

export default async function PublicBriefingPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  return <PublicBriefingForm token={token}/>;
}
