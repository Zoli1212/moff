/**
 * UI strings, keyed by dot-path.
 *
 * Hungarian is the source of truth: it is what the product already says, so a missing
 * English key falls back to it rather than showing a raw key to the user. A half
 * translated screen is readable; "offers.detail.title" is not.
 */

import type { Locale } from "./config";

export const messages = {
  hu: {
    "common.back": "Vissza",
    "common.close": "Bezárás",
    "common.cancel": "Mégse",
    "common.save": "Mentés",
    "common.saving": "Mentés…",
    "common.delete": "Törlés",
    "common.loading": "Betöltés…",
    "common.details": "Részletek",
    "common.language": "Nyelv",
    "common.currency": "Deviza",

    "offers.title": "Ajánlatok",
    "offers.empty": "Még nincs ajánlat.",
    "offers.detailsTitle": "Ajánlat részletei",
    "offers.summary": "Összefoglalás",
    "offers.requirement": "Követelmény",
    "offers.moreInfo": "További információk",
    "offers.items": "Tételek",
    "offers.newItem": "Új tétel",
    "offers.refineItems": "Tételek pontosítása",
    "offers.alternatives": "Mi lenne, ha… — alternatívák",
    "offers.totalPrice": "Végösszeg",
    "offers.status": "Státusz",
    "offers.createdAt": "Létrehozva",
    "offers.validUntil": "Érvényes eddig",
    "offers.unitPrice": "Egységár",
    "offers.material": "Anyag",
    "offers.fee": "Díj",
    "offers.estimatedDuration": "Becsült időtartam",

    "offers.list.backHome": "Vissza a főoldalra",
    "offers.list.untitled": "Névtelen ajánlat",
    "offers.list.uploadExisting": "Meglévő ajánlat feltöltése",
    "offers.list.estimatedTime": "Becsült kivitelezési idő",
    "offers.list.work": "Munka",
    "offers.list.deleteTitle": "Ajánlat törlése",
    "offers.list.deleted": "Ajánlat sikeresen törölve",
    "offers.list.deleteFailed": "Hiba történt a törlés során",

    "offers.status.draft": "Piszkozat",
    "offers.status.sent": "Elküldve",
    "offers.status.accepted": "Elfogadva",
    "offers.status.rejected": "Elutasítva",

    "offers.currency.label": "Az ajánlat devizája",
    "offers.currency.rate": "Árfolyam (1 EUR = ? Ft)",
    "offers.currency.rateHint":
      "Az ajánlat készítésekor rögzül, hogy az összeg később ne változzon.",
    "offers.currency.converted": "Átváltva a rögzített árfolyamon",

    "scenarios.title": "Alternatívák",
    "scenarios.constraintLabel": "Mi a megszorítás?",
    "scenarios.request": "Alternatívák kérése",
    "scenarios.analysing": "Elemzés…",
    "scenarios.notAnOffer":
      "Itt nem készül új ajánlat. Az AI elolvassa a meglévő ajánlatot és az eredeti igényt, majd megmutatja, mi a mozgástered a megadott korlát mellett. Az ajánlaton semmi nem változik.",
  },

  en: {
    "common.back": "Back",
    "common.close": "Close",
    "common.cancel": "Cancel",
    "common.save": "Save",
    "common.saving": "Saving…",
    "common.delete": "Delete",
    "common.loading": "Loading…",
    "common.details": "Details",
    "common.language": "Language",
    "common.currency": "Currency",

    "offers.title": "Offers",
    "offers.empty": "No offers yet.",
    "offers.detailsTitle": "Offer details",
    "offers.summary": "Summary",
    "offers.requirement": "Requirement",
    "offers.moreInfo": "Additional information",
    "offers.items": "Line items",
    "offers.newItem": "New item",
    "offers.refineItems": "Refine line items",
    "offers.alternatives": "What if… — alternatives",
    "offers.totalPrice": "Total",
    "offers.status": "Status",
    "offers.createdAt": "Created",
    "offers.validUntil": "Valid until",
    "offers.unitPrice": "Unit price",
    "offers.material": "Material",
    "offers.fee": "Labour",
    "offers.estimatedDuration": "Estimated duration",

    "offers.list.backHome": "Back to home",
    "offers.list.untitled": "Untitled offer",
    "offers.list.uploadExisting": "Upload an existing offer",
    "offers.list.estimatedTime": "Estimated duration",
    "offers.list.work": "Job",
    "offers.list.deleteTitle": "Delete offer",
    "offers.list.deleted": "Offer deleted",
    "offers.list.deleteFailed": "Deleting the offer failed",

    "offers.status.draft": "Draft",
    "offers.status.sent": "Sent",
    "offers.status.accepted": "Accepted",
    "offers.status.rejected": "Rejected",

    "offers.currency.label": "Offer currency",
    "offers.currency.rate": "Exchange rate (1 EUR = ? HUF)",
    "offers.currency.rateHint":
      "Captured when the offer is created, so the amount cannot change later.",
    "offers.currency.converted": "Converted at the captured rate",

    "scenarios.title": "Alternatives",
    "scenarios.constraintLabel": "What is the constraint?",
    "scenarios.request": "Get alternatives",
    "scenarios.analysing": "Analysing…",
    "scenarios.notAnOffer":
      "No new offer is produced here. The AI reads the existing offer and the original requirement, then shows what room you have under the stated constraint. Nothing on the offer changes.",
  },
} satisfies Record<Locale, Record<string, string>>;

export type MessageKey = keyof (typeof messages)["hu"];

/** Falls back to Hungarian, then to the key itself, so nothing renders blank. */
export function translate(locale: Locale, key: MessageKey): string {
  const dictionary = messages[locale] as Record<string, string>;
  return dictionary[key] ?? messages.hu[key] ?? key;
}
