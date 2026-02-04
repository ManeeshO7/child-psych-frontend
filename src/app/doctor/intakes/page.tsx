import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import DoctorIntakesList from "@/components/DoctorIntakesList";

export default async function DoctorIntakesPage() {
  const session = await getSession();
  if (!session || session.role !== "doctor") {
    redirect("/doctor/login");
  }
  return <DoctorIntakesList />;
}
