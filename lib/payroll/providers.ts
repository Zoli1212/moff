/**
 * The provider registry.
 *
 * Empty on purpose. We looked for a Hungarian payroll product with a REST API a third
 * party can call and did not find one published; the integrations that exist are
 * file-based or vendor-to-vendor. Rather than invent an adapter against a guessed API,
 * the registry stays empty and the interface waits.
 *
 * Adding one is: implement PayrollProvider, push it into PROVIDERS, done. Nothing that
 * builds the run needs to know which provider is on the other end.
 */

import type { PayrollProvider } from "./types";

export const PROVIDERS: PayrollProvider[] = [];

/**
 * Payroll systems listed in Számlázz.hu's "Bérszámfejtés" integration category.
 *
 * Candidates rather than a plan: they integrate *with* Számlázz.hu, which says nothing
 * about whether they expose an API to us. Kept here so whoever picks up the integration
 * starts from the same shortlist instead of researching it again.
 */
export const CANDIDATE_SYSTEMS = [
  { name: "Novitax (NTAX)", note: "Kettős könyvviteli és bérprogram" },
  { name: "ARONIC", note: "Kettős könyvelés és bérszámfejtés" },
  { name: "Cobra Computer", note: "Vállalatirányítás, számlázás, bérszámfejtés" },
  { name: "Makrodigit", note: "Kettős könyvelő és bérszámfejtő rendszer" },
  { name: "QualitySoft", note: "Könyvelő- és bérprogram" },
] as const;

/** The configured provider, or null while none is connected. */
export function getActiveProvider(): PayrollProvider | null {
  return PROVIDERS.find((provider) => provider.isConfigured()) ?? null;
}
