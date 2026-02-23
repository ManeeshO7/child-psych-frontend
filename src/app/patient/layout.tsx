import { redirect } from "next/navigation";
import Header from "@/components/Header";
import { getSession } from "@/lib/session";

export default async function PatientLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await getSession();
  if (!session || session.role !== "patient") {
    redirect("/login");
  }

  return (
    <div className="min-h-screen bg-cream-50">
      <Header />
      {children}
    </div>
  );
}

