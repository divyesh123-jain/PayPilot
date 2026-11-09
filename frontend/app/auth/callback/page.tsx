"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { getAuthMe, type AuthUser } from "@/frontend/lib/api";
import type { BusinessKey } from "@/frontend/features/paypilot/types";

function persistAuthUser(user: AuthUser): void {
  const session = {
    name: user.name,
    email: user.email,
    businessName: user.name,
    businessKey: "freelancer" as BusinessKey,
    isAuthenticated: true,
    paypalPayerId: user.paypalPayerId,
    userId: user.userId,
  };
  try {
    localStorage.setItem("paypilot_user_session", JSON.stringify(session));
  } catch {
    // ignore storage failures
  }
}

export default function AuthCallbackPage() {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let active = true;
    getAuthMe()
      .then((user) => {
        if (!active) return;
        persistAuthUser(user);
        const completed = localStorage.getItem("paypilot_onboarding_completed") === "true";
        router.replace(completed ? "/" : "/?auth=paypal");
      })
      .catch((err: unknown) => {
        if (!active) return;
        setError(err instanceof Error ? err.message : "PayPal sign-in failed");
      });
    return () => {
      active = false;
    };
  }, [router]);

  return (
    <main className="min-h-screen flex items-center justify-center bg-slate-50 px-4">
      <div className="max-w-md w-full rounded-2xl border border-slate-200 bg-white p-8 shadow-sm text-center">
        <h1 className="font-display text-xl font-extrabold text-slate-900">Finishing PayPal sign-in</h1>
        {error ? (
          <p className="mt-3 text-sm text-red-700" role="alert">
            {error}
          </p>
        ) : (
          <p className="mt-3 text-sm text-slate-600">Confirming your PayPal session…</p>
        )}
        {error ? (
          <a href="/" className="mt-6 inline-block text-sm font-semibold text-indigo-600 hover:underline">
            Back to PayPilot
          </a>
        ) : null}
      </div>
    </main>
  );
}
