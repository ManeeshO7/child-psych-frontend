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
    <button type="button" onClick={handleLogout} className="text-sm text-gray-600 hover:text-warm-brown">
      Logout
    </button>
  );
}
