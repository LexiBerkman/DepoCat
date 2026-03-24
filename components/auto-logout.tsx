"use client";

import { useEffect, useRef, useTransition } from "react";

import { logoutAction } from "@/lib/actions";

const AUTO_LOGOUT_MS = 10 * 60 * 1000;

export function AutoLogout() {
  const [, startTransition] = useTransition();
  const timerRef = useRef<number | null>(null);
  const hasLoggedOutRef = useRef(false);

  useEffect(() => {
    const logoutForInactivity = () => {
      if (hasLoggedOutRef.current) {
        return;
      }

      hasLoggedOutRef.current = true;
      startTransition(() => logoutAction());
    };

    const resetTimer = () => {
      if (hasLoggedOutRef.current) {
        return;
      }

      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }

      timerRef.current = window.setTimeout(logoutForInactivity, AUTO_LOGOUT_MS);
    };

    const events: Array<keyof WindowEventMap> = [
      "click",
      "keydown",
      "mousemove",
      "scroll",
      "touchstart",
      "focus",
    ];

    events.forEach((eventName) => {
      window.addEventListener(eventName, resetTimer, { passive: true });
    });

    resetTimer();

    return () => {
      events.forEach((eventName) => {
        window.removeEventListener(eventName, resetTimer);
      });

      if (timerRef.current) {
        window.clearTimeout(timerRef.current);
      }
    };
  }, [startTransition]);

  return null;
}
