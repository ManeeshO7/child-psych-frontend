import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import DoctorAppointmentsList from "@/components/DoctorAppointmentsList";

export default async function DoctorAppointmentsPage() {
  const session = await getSession();
  if (!session || session.role !== "doctor") {
    redirect("/doctor/login");
  }
  return <DoctorAppointmentsList />;
}
