import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import DoctorAvailabilityManager from "@/components/DoctorAvailabilityManager";

export default async function DoctorAvailabilityPage() {
  const session = await getSession();
  if (!session || session.role !== "doctor") {
    redirect("/doctor/login");
  }
  return <DoctorAvailabilityManager />;
}
