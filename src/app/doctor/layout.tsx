import Link from "next/link";
import DoctorLogoutButton from "@/components/DoctorLogoutButton";

export default function DoctorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-cream-50">
      <header className="sticky top-0 z-40 border-b border-cream-200 bg-white">
        <div className="mx-auto flex h-14 max-w-6xl items-center justify-between px-4 sm:px-6 lg:px-8">
          <Link href="/doctor" className="font-semibold text-warm-brown">
            TelePsych — Doctor Portal
          </Link>
          <DoctorLogoutButton />
        </div>
      </header>
      {children}
    </div>
  );
}
