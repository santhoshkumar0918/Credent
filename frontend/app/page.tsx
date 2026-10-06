import Link from "next/link";

const ROUTES = [
  { href: "/attester", label: "Attester dashboard" },
  { href: "/record", label: 'Subject "My Record"' },
  { href: "/consent", label: "Consent grant flow" },
  { href: "/lender", label: "Lender underwriting console" },
  { href: "/challenge", label: "Challenge console" },
  { href: "/explorer", label: "Public attester explorer" },
];

export default function Home() {
  return (
    <main>
      <h1>Vouchain</h1>
      <p>
        Permissionless on-chain credit attestations on Monad. Boilerplate
        home — slice 4 (frontend-agent) builds the six screens per
        prd/Credent-prd.md §14.
      </p>
      <nav>
        <ul>
          {ROUTES.map((r) => (
            <li key={r.href}>
              <Link href={r.href}>{r.label}</Link>
            </li>
          ))}
        </ul>
      </nav>
    </main>
  );
}
