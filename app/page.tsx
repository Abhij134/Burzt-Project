import { auth } from "@/lib/auth";
import { headers } from "next/headers";
import { redirect } from "next/navigation";

export default async function Home() {
  // Check if the user has an active session
  const session = await auth.api.getSession({
    headers: await headers()
  });

  // Route them accordingly
  if (session) {
    redirect("/dashboard");
  } else {
    redirect("/login");
  }
}