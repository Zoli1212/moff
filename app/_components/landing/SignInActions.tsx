"use client";

import { SignInButton } from "@clerk/nextjs";
import type { ReactNode } from "react";

/**
 * The two ways into the product, defined once.
 *
 * The landing page offers each entry point in several places — the header, the audience
 * split, the closing call to action — and the two differ only by where Clerk sends you
 * afterwards. Keeping the redirect targets in one file means a second button can never
 * quietly point somewhere else.
 *
 * These values are carried over unchanged from the previous landing page: a customer
 * lands on the quote request, a contractor on the dashboard.
 */
const CUSTOMER_REDIRECT = "/quote-request";
const CONTRACTOR_REDIRECT = "/dashboard";

export function CustomerSignIn({ children }: { children: ReactNode }) {
  return (
    <SignInButton mode="modal" forceRedirectUrl={CUSTOMER_REDIRECT}>
      {children}
    </SignInButton>
  );
}

export function ContractorSignIn({ children }: { children: ReactNode }) {
  return (
    <SignInButton mode="modal" forceRedirectUrl={CONTRACTOR_REDIRECT}>
      {children}
    </SignInButton>
  );
}
