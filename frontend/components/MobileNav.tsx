"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useRole } from "@/lib/role-context";
import { ROLE_NAV, Icon, isNavActive } from "@/lib/nav";

/** Bottom tab bar for phones — same ROLE_NAV seam as the desktop Sidebar,
    capped at 5 items so thumbs stay honest. */
export function MobileNav() {
  const pathname = usePathname();
  const { role } = useRole();
  const items = (ROLE_NAV[role] ?? ROLE_NAV.SUBJECT).slice(0, 5);

  return (
    <nav className="mobile-nav" aria-label="Primary">
      <div className="mobile-nav-inner">
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className={`mobile-nav-item${isNavActive(pathname, item.href) ? " active" : ""}`}
          >
            <Icon name={item.icon} />
            <span>{item.label.split(" ")[0]}</span>
          </Link>
        ))}
      </div>
    </nav>
  );
}
