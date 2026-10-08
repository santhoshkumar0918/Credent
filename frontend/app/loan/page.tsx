import { redirect } from "next/navigation";

export default function LegacyLoanRedirect() {
  redirect("/app/loan");
}
