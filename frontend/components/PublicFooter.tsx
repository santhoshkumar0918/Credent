import Link from "next/link";

export function PublicFooter() {
  return (
    <footer
      style={{
        padding: "3rem 2rem",
        borderTop: "1px solid var(--vc-border)",
        background: "#07080B",
        color: "var(--vc-text-muted)",
        fontSize: "0.85rem",
      }}
    >
      <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
        <div>
          <span style={{ fontWeight: 700, color: "var(--vc-text-primary)", marginRight: "0.5rem" }}>Vouchain</span>
          © 2026 — Open Credit Evidence Layer on Monad.
        </div>
        <div style={{ display: "flex", gap: "1.5rem" }}>
          <Link href="/how-it-works" style={{ color: "var(--vc-text-secondary)" }}>How it works</Link>
          <Link href="/explorer" style={{ color: "var(--vc-text-secondary)" }}>Attester Explorer</Link>
          <Link href="/transparency" style={{ color: "var(--vc-text-secondary)" }}>Transparency & Honesty</Link>
        </div>
      </div>
    </footer>
  );
}
