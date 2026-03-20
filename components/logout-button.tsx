"use client";

import { useTransition } from "react";

import { logoutAction } from "@/lib/actions";

export function LogoutButton() {
  const [pending, startTransition] = useTransition();

  return (
    <button
      className="button-secondary"
      type="button"
      onClick={() => startTransition(() => logoutAction())}
      disabled={pending}
    >
      {pending ? "Signing out..." : "Lock DepoCat"}
    </button>
  );
}
