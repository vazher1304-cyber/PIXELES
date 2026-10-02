import OfficeRoom from "@/components/OfficeRoom";

export default async function OfficePage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  return <OfficeRoom officeId={decodeURIComponent(id)} />;
}
