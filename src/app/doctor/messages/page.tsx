import { redirect } from "next/navigation";
import SecureMessagesInbox from "@/components/SecureMessagesInbox";
import { getSession } from "@/lib/session";

export default async function DoctorMessagesPage() {
  const session = await getSession();
  if (!session || session.role !== "doctor") {
    redirect("/doctor/login");
  }
  return <SecureMessagesInbox role="doctor" />;
}
