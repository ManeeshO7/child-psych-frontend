import { redirect } from "next/navigation";
import Link from "next/link";
import LogoutButton from "@/components/LogoutButton";
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
      <header className="sticky top-0 z-40 border-b border-cream-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/patient" className="font-semibold text-warm-brown">
            TelePsych — Patient Portal
          </Link>
          <LogoutButton />
        </div>
      </header>
      {children}
    </div>
  );
}

