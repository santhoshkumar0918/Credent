import { redirect } from "next/navigation";

export default function LegacyConsentRedirect() {
  redirect("/app/consent");
}
