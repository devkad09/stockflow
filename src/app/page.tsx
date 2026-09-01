import { getCurrentUserAndBusiness } from "@/lib/auth";
import { redirect } from "next/navigation";

export default async function HomePage() {
  const auth = await getCurrentUserAndBusiness();
  if (auth) {
    redirect("/dashboard");
  } else {
    redirect("/login");
  }
}
