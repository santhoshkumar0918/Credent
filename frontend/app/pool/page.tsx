import { redirect } from "next/navigation";

export default function LegacyPoolRedirect() {
  redirect("/app/pool");
}
