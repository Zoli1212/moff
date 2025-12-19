import ProcurementClient from "./ProcurementClient";

interface PageProps {
  params: Promise<{ id: string }>;
}

export default async function ProcurementPage({ params }: PageProps) {
  const { id } = await params;
  const workId = Number(id);

  return <ProcurementClient workId={workId} />;
}
