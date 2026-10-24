import { redirect } from "next/navigation";
import { getSession } from "@/lib/session";
import DoctorFormsManager from "@/components/DoctorFormsManager";

export default async function DoctorFormsPage() {
  const session = await getSession();
  if (!session || session.role !== "doctor") {
    redirect("/doctor/login");
  }
  return <DoctorFormsManager />;
}
