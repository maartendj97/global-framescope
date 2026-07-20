"use server";

import { redirect } from "next/navigation";
import { attemptLogin, logout } from "@/lib/session";

export type LoginState = { error: string } | undefined;

export async function login(_prevState: LoginState, formData: FormData): Promise<LoginState> {
  const password = String(formData.get("password") ?? "");
  const success = await attemptLogin(password);
  if (!success) return { error: "Incorrect password." };
  redirect("/");
}

export async function logoutAction(): Promise<void> {
  await logout();
  redirect("/");
}
