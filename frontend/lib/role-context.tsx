"use client";

import {
  createContext,
  useContext,
  useState,
  type ReactNode,
} from "react";

export type Role = "SUBJECT" | "ATTESTER" | "LENDER" | "WATCHER";

interface RoleContextValue {
  role: Role;
  setRole: (r: Role) => void;
  allRoles: Role[];
}

const RoleContext = createContext<RoleContextValue | null>(null);

const ALL_ROLES: Role[] = ["SUBJECT", "ATTESTER", "LENDER", "WATCHER"];

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRole] = useState<Role>("SUBJECT");
  return (
    <RoleContext.Provider value={{ role, setRole, allRoles: ALL_ROLES }}>
      {children}
    </RoleContext.Provider>
  );
}

export function useRole(): RoleContextValue {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used inside RoleProvider");
  return ctx;
}
