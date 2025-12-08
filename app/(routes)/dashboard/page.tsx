import { getCurrentUserData } from "@/actions/user-actions";
import DashboardIcons from "./_components/DashboardIcons";

export const dynamic = "force-dynamic";

export default async function Dashboard() {
  // Server-side role detection - no layout shift!
  const userData = await getCurrentUserData();
  const isTenant = userData.isTenant ?? true;

  return <DashboardIcons isTenant={isTenant} />;
}
