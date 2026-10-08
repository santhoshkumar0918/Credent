export default function OnboardingLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        background: "var(--vc-bg)",
        padding: "2rem 1rem",
      }}
    >
      <div style={{ width: "100%", maxWidth: 540 }}>{children}</div>
    </div>
  );
}
