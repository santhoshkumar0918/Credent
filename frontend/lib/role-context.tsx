"use client";

import {
  createContext,
  useContext,
  useState,
  useEffect,
  type ReactNode,
} from "react";
import { usePrivy } from "@privy-io/react-auth";
import { useRouter } from "next/navigation";

export type Role = "SUBJECT" | "ATTESTER" | "LENDER" | "WATCHER";

interface RoleContextValue {
  role: Role;
  setRole: (r: Role) => void;
  allRoles: Role[];
  isOnboarded: boolean;
  setOnboarded: (val: boolean) => void;
  logoutAndClear: () => Promise<void>;
}

const RoleContext = createContext<RoleContextValue | null>(null);

const ALL_ROLES: Role[] = ["SUBJECT", "ATTESTER", "LENDER", "WATCHER"];

export function RoleProvider({ children }: { children: ReactNode }) {
  const [role, setRoleState] = useState<Role>("SUBJECT");
  const [isOnboarded, setIsOnboardedState] = useState<boolean>(false);
  const { logout, authenticated } = usePrivy();
  const router = useRouter();

  useEffect(() => {
    if (typeof window !== "undefined") {
      const savedRole = localStorage.getItem("vc_role") as Role;
      if (savedRole && ALL_ROLES.includes(savedRole)) {
        setRoleState(savedRole);
      }
      const savedOnboarded = localStorage.getItem("vc_onboarded");
      if (savedOnboarded === "true") {
        setIsOnboardedState(true);
      }
    }
  }, []);

  const setRole = (r: Role) => {
    setRoleState(r);
    if (typeof window !== "undefined") {
      localStorage.setItem("vc_role", r);
    }
  };

  const setOnboarded = (val: boolean) => {
    setIsOnboardedState(val);
    if (typeof window !== "undefined") {
      localStorage.setItem("vc_onboarded", val ? "true" : "false");
    }
  };

  const logoutAndClear = async () => {
    if (typeof window !== "undefined") {
      localStorage.removeItem("vc_role");
      localStorage.removeItem("vc_onboarded");
    }
    setIsOnboardedState(false);
    setRoleState("SUBJECT");
    try {
      if (authenticated) {
        await logout();
      }
    } catch (e) {
      console.warn("Logout note:", e);
    }
    router.push("/");
  };

  return (
    <RoleContext.Provider
      value={{
        role,
        setRole,
        allRoles: ALL_ROLES,
        isOnboarded,
        setOnboarded,
        logoutAndClear,
      }}
    >
      {children}
    </RoleContext.Provider>
  );
}

export function useRole(): RoleContextValue {
  const ctx = useContext(RoleContext);
  if (!ctx) throw new Error("useRole must be used inside RoleProvider");
  return ctx;
}
