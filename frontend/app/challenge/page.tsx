import { redirect } from "next/navigation";

export default function LegacyChallengeRedirect() {
  redirect("/app/challenge");
}
