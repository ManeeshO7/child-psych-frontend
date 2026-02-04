import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import DoctorRequestsList from "@/components/DoctorRequestsList";

export default async function DoctorRequestsPage() {
  const session = await getSession();
  if (!session || session.role !== "doctor") {
    redirect("/doctor/login");
  }
  return <DoctorRequestsList />;
}
