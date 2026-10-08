"use client";

import { usePrivy } from "@privy-io/react-auth";
import { useRole } from "@/lib/role-context";
import { useRouter, useSearchParams } from "next/navigation";
import { useEffect, Suspense } from "react";

function LoginContent() {
  const { login, authenticated, ready } = usePrivy();
  const { isOnboarded } = useRole();
  const router = useRouter();
  const searchParams = useSearchParams();
  const redirectPath = searchParams.get("redirect") || "/app/home";

  useEffect(() => {
    if (ready && authenticated) {
      if (!isOnboarded) {
        router.push("/onboarding");
      } else {
        router.push(redirectPath);
      }
    }
  }, [ready, authenticated, isOnboarded, router, redirectPath]);

  return (
    <div style={{ padding: "4rem 1.5rem", maxWidth: 480, margin: "0 auto", textAlign: "center" }}>
      <div className="card" style={{ padding: "2.5rem 2rem" }}>
        <div
          style={{
            width: 48,
            height: 48,
            borderRadius: 12,
            background: "linear-gradient(135deg, #7C3AED, #38BDF8)",
            margin: "0 auto 1.5rem",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            fontSize: "1.4rem",
            fontWeight: 700,
            color: "#fff",
            fontFamily: "var(--font-heading)",
            boxShadow: "0 0 25px rgba(124, 58, 237, 0.4)",
          }}
        >
          V
        </div>

        <h1 style={{ fontFamily: "var(--font-heading)", fontSize: "1.5rem", fontWeight: 700, marginBottom: "0.5rem" }}>
          Sign in to Vouchain
        </h1>
        <p style={{ fontSize: "0.88rem", color: "var(--vc-text-secondary)", marginBottom: "2rem" }}>
          Login with your passkey, phone OTP, or email. No seed phrases or crypto wallets required.
        </p>

        <div style={{ display: "flex", flexDirection: "column", gap: "1rem" }}>
          <button
            onClick={() => login()}
            className="btn btn-primary btn-lg"
            style={{ width: "100%", justifyContent: "center", cursor: "pointer" }}
          >
            🔑 Continue with Passkey / Phone
          </button>

          <div style={{ fontSize: "0.75rem", color: "var(--vc-text-muted)", marginTop: "0.5rem" }}>
            Self-custodial embedded wallet created automatically on login.
          </div>
        </div>
      </div>
    </div>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={
      <div style={{ display: "flex", justifyContent: "center", alignItems: "center", minHeight: "50vh" }}>
        <div className="spinner" />
      </div>
    }>
      <LoginContent />
    </Suspense>
  );
}
