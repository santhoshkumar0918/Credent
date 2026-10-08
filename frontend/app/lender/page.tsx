import { redirect } from "next/navigation";

export default function LegacyLenderRedirect() {
  redirect("/app/lender");
}
