import { PublicNavbar } from "@/components/PublicNavbar";
import { PublicFooter } from "@/components/PublicFooter";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div style={{ minHeight: "100vh", display: "flex", flexDirection: "column", background: "var(--vc-bg)" }}>
      <PublicNavbar />
      <div style={{ flex: 1 }}>{children}</div>
      <PublicFooter />
    </div>
  );
}
