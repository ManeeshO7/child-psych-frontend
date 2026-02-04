import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import DoctorDashboardOverview from "@/components/DoctorDashboardOverview";

export default async function DoctorPage() {
  const session = await getSession();
  if (!session || session.role !== "doctor") {
    redirect("/doctor/login");
  }
  return <DoctorDashboardOverview />;
}
