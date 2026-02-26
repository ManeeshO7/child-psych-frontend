import Header from "@/components/Header";

export default function DoctorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex min-h-screen flex-col bg-cream-50">
      <Header />
      <div className="flex flex-1 flex-col">{children}</div>
    </div>
  );
}
