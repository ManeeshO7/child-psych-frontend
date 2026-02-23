"use client";

import { useRouter } from "next/navigation";

export default function LogoutButton() {
  const router = useRouter();
  async function handleLogout() {
    await fetch("/api/auth/logout", { method: "POST", credentials: "include" });
    router.push("/");
    router.refresh();
  }
  return (
    <button
      type="button"
      onClick={handleLogout}
      className="rounded-lg border border-warm-brown/40 bg-white px-4 py-2 text-sm font-medium text-warm-brown shadow-sm transition-colors hover:bg-warm-brown hover:text-white focus:outline-none focus:ring-2 focus:ring-warm-brown focus:ring-offset-2"
    >
      Logout
    </button>
  );
}
