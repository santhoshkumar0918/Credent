"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRole } from "@/lib/role-context";
import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState, type ReactNode } from "react";

export function AuthGate({ children }: { children: ReactNode }) {
  const { ready, authenticated } = usePrivy();
  const { isOnboarded } = useRole();
  const router = useRouter();
  const pathname = usePathname();
  const [checked, setChecked] = useState(false);

  useEffect(() => {
    if (!ready) return;

    if (!authenticated) {
      router.push(`/login?redirect=${encodeURIComponent(pathname)}`);
      return;
    }

    if (!isOnboarded && !pathname.startsWith("/onboarding")) {
      router.push("/onboarding");
      return;
    }

    setChecked(true);
  }, [ready, authenticated, isOnboarded, pathname, router]);

  if (!ready || (!checked && authenticated)) {
    return (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          minHeight: "100vh",
          background: "var(--vc-bg)",
        }}
      >
        <div style={{ textAlign: "center" }}>
          <img src="/logo.jpeg" alt="Credent" width={44} height={44}
            style={{ borderRadius: 12, margin: "0 auto 1.25rem", display: "block" }} />
          <div className="skeleton" style={{ width: 140, height: 8, borderRadius: 4, margin: "0 auto" }} />
          <p style={{ marginTop: "1rem", fontSize: "0.85rem", color: "var(--vc-text-muted)" }}>
            Authenticating Credent Session...
          </p>
        </div>
      </div>
    );
  }

  return <>{children}</>;
}
