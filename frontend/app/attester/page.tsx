import { redirect } from "next/navigation";

export default function LegacyAttesterRedirect() {
  redirect("/app/attester");
}
