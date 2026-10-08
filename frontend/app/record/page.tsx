import { redirect } from "next/navigation";

export default function LegacyRecordRedirect() {
  redirect("/app/record");
}
