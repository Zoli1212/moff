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

    "plan.title": "Ütemterv",
    "plan.kanban": "Kanban",
    "plan.gantt": "Gantt",
    "plan.newTask": "Feladat",
    "plan.aiPlan": "AI ütemterv",
    "plan.generating": "Generálás…",
    "plan.empty": "Még nincs ütemterv ehhez a munkához.",
    "plan.emptyHint":
      "Generáltasd az AI-jal a munka tételeiből, vagy vegyél fel feladatot kézzel. Az AI által javasolt ütemterv utána szabadon szerkeszthető.",
    "plan.dependencies": "Függőségek",
    "plan.statusFailed": "A státusz módosítása nem sikerült.",
    "plan.dropHere": "Húzz ide egy feladatot",
    "plan.noTask": "Nincs feladat",
    "plan.subtasks": "Alfeladatok",
    "plan.unavailable": "Az ütemterv most nem érhető el",
    "plan.retry": "Újrapróbálás",
    "plan.backToTasks": "Vissza a feladatokhoz",
    "plan.ganttReadOnly":
      "Az idővonal csak megjelenít. A nyilak a szakmai sorrendet mutatják, de nem ütemeznek át semmit — átütemezni a feladatra koppintva, a dátum mezőkben lehet.",

    "task.newTask": "Új feladat",
    "task.newSubtask": "Új alfeladat",
    "task.edit": "Feladat szerkesztése",
    "task.name": "Megnevezés",
    "task.trade": "Szakma",
    "task.description": "Leírás",
    "task.start": "Kezdés",
    "task.end": "Befejezés",
    "task.assignee": "Felelős",
    "task.status": "Státusz",
    "task.progress": "Haladás",
    "task.noneSelected": "Nincs kijelölve",
    "task.predecessors": "Előzmények — ezeknek előbb kell befejeződniük",
    "task.addPredecessor": "Előzmény hozzáadása…",
    "task.noMorePredecessors": "Nincs több választható feladat",
    "task.removeLink": "Kapcsolat törlése",
    "task.unknownTask": "Ismeretlen feladat",
    "task.arrowHint": "A nyíl csak jelzi az összefüggést — a dátumokat nem tolja el automatikusan.",
    "task.created": "Feladat létrehozva.",
    "task.saved": "Feladat mentve.",
    "task.nameRequired": "A feladat neve kötelező.",
    "task.tradeRequired": "A szakma megadása kötelező.",
    "task.endBeforeStart": "A befejezés nem lehet korábban, mint a kezdés.",
    "task.endBeforeStartShort": "A befejezés korábbi, mint a kezdés.",
    "task.saveFailed": "A mentés nem sikerült.",
    "task.linkFailed": "A kapcsolat létrehozása nem sikerült.",
    "task.unlinkFailed": "A kapcsolat törlése nem sikerült.",

    "status.todo": "Teendő",
    "status.in_progress": "Folyamatban",
    "status.blocked": "Akadályozva",
    "status.done": "Kész",

    "ranking.title": "Teljesítmény-rangsor",
    "ranking.subtitle": "A napló bejegyzéseiből számolva",
    "ranking.best": "Legjobban teljesítők",
    "ranking.weakest": "Leggyengébben teljesítők",
    "ranking.hours": "Ledolgozott óra",
    "ranking.activeDays": "Aktív napok",
    "ranking.acceptanceRate": "Elfogadási arány",
    "ranking.worksCount": "Munkák száma",
    "ranking.headcount": "fő",
    "ranking.empty":
      "Ebben az időszakban nincs nevesített dolgozóhoz kötött naplóbejegyzés.",
    "ranking.withinTrade":
      "Az egyéni sorrend szakmán belül értendő. A naplóban szereplő mennyiségek szakmánként más mértékegységben vannak, ezért azokból nem képezhető összehasonlítható teljesítmény.",
    "ranking.coverage":
      "{total} naplóbejegyzésből {attributed} köthető nevesített dolgozóhoz ({percent}%). A többi munka megtörtént, de nem szerepel ebben a rangsorban.",
    "ranking.hoursShort": "óra",
    "ranking.daysShort": "nap",
    "ranking.jobsShort": "munka",
    "ranking.acceptedShort": "elfogadva",
    "ranking.period.30": "30 nap",
    "ranking.period.90": "90 nap",
    "ranking.period.365": "1 év",
    "ranking.period.all": "Teljes",

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

    "plan.title": "Schedule",
    "plan.kanban": "Kanban",
    "plan.gantt": "Gantt",
    "plan.newTask": "Task",
    "plan.aiPlan": "AI schedule",
    "plan.generating": "Generating…",
    "plan.empty": "No schedule for this job yet.",
    "plan.emptyHint":
      "Generate one from the job's line items, or add tasks by hand. Whatever the AI proposes stays fully editable.",
    "plan.dependencies": "Dependencies",
    "plan.statusFailed": "Changing the status failed.",
    "plan.dropHere": "Drop a task here",
    "plan.noTask": "No tasks",
    "plan.subtasks": "Subtasks",
    "plan.unavailable": "The schedule is unavailable right now",
    "plan.retry": "Try again",
    "plan.backToTasks": "Back to tasks",
    "plan.ganttReadOnly":
      "The timeline is display only. Arrows show the trade sequence but reschedule nothing — tap a task to change its dates.",

    "task.newTask": "New task",
    "task.newSubtask": "New subtask",
    "task.edit": "Edit task",
    "task.name": "Name",
    "task.trade": "Trade",
    "task.description": "Description",
    "task.start": "Start",
    "task.end": "End",
    "task.assignee": "Assignee",
    "task.status": "Status",
    "task.progress": "Progress",
    "task.noneSelected": "Not assigned",
    "task.predecessors": "Predecessors — these must finish first",
    "task.addPredecessor": "Add a predecessor…",
    "task.noMorePredecessors": "No other task to choose",
    "task.removeLink": "Remove link",
    "task.unknownTask": "Unknown task",
    "task.arrowHint": "The arrow only shows the relationship — it does not shift any dates.",
    "task.created": "Task created.",
    "task.saved": "Task saved.",
    "task.nameRequired": "The task name is required.",
    "task.tradeRequired": "The trade is required.",
    "task.endBeforeStart": "The end cannot be earlier than the start.",
    "task.endBeforeStartShort": "The end is earlier than the start.",
    "task.saveFailed": "Saving failed.",
    "task.linkFailed": "Creating the link failed.",
    "task.unlinkFailed": "Removing the link failed.",

    "status.todo": "To do",
    "status.in_progress": "In progress",
    "status.blocked": "Blocked",
    "status.done": "Done",

    "ranking.title": "Performance ranking",
    "ranking.subtitle": "Derived from diary entries",
    "ranking.best": "Top performers",
    "ranking.weakest": "Lowest performers",
    "ranking.hours": "Hours logged",
    "ranking.activeDays": "Active days",
    "ranking.acceptanceRate": "Acceptance rate",
    "ranking.worksCount": "Jobs worked on",
    "ranking.headcount": "people",
    "ranking.empty":
      "No diary entries attributed to a named worker in this period.",
    "ranking.withinTrade":
      "Individual order is within a trade. Diary quantities use different units per trade, so they cannot produce a comparable performance figure.",
    "ranking.coverage":
      "{attributed} of {total} diary entries can be attributed to a named worker ({percent}%). The rest of the work happened, but does not appear in this ranking.",
    "ranking.hoursShort": "h",
    "ranking.daysShort": "days",
    "ranking.jobsShort": "jobs",
    "ranking.acceptedShort": "accepted",
    "ranking.period.30": "30 days",
    "ranking.period.90": "90 days",
    "ranking.period.365": "1 year",
    "ranking.period.all": "All time",

    "scenarios.title": "Alternatives",
    "scenarios.constraintLabel": "What is the constraint?",
    "scenarios.request": "Get alternatives",
    "scenarios.analysing": "Analysing…",
    "scenarios.notAnOffer":
      "No new offer is produced here. The AI reads the existing offer and the original requirement, then shows what room you have under the stated constraint. Nothing on the offer changes.",
  },
} satisfies Record<Locale, Record<string, string>>;

export type MessageKey = keyof (typeof messages)["hu"];

/**
 * Falls back to Hungarian, then to the key itself, so nothing renders blank.
 *
 * Supports {name} placeholders. Sentences that carry numbers read differently in each
 * language - word order, what gets a suffix - so they have to be translated whole rather
 * than assembled from fragments in JSX.
 */
export function translate(
  locale: Locale,
  key: MessageKey,
  params?: Record<string, string | number>
): string {
  const dictionary = messages[locale] as Record<string, string>;
  const template = dictionary[key] ?? messages.hu[key] ?? key;

  if (!params) return template;

  return template.replace(/\{(\w+)\}/g, (match, name: string) =>
    name in params ? String(params[name]) : match
  );
}
