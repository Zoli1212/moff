/**
 * Turns our work diary into the shape the e-építési napló asks for.
 *
 * The official offline route is: download a personalised ÁNYK template from the
 * e-napló, fill it in, save it, upload the resulting .enyk file. The template carries
 * the filer's identity — "a kitöltött nyomtatvány mindig annak a nevében készül, aki a
 * sablont letöltötte, és csak abba az e-naplóba tölthető fel, ahonnan letöltötték" — so
 * the final file can only ever be produced on the user's own machine. What we can do is
 * hand them the day's content already grouped and worded the way the form wants it.
 *
 * The form's napi jelentés is one report per calendar day. Our WorkDiary rows are per
 * work item, so a single day usually spans several rows; collapsing them is the whole
 * job of this module.
 *
 * Everything here is pure so the grouping rules can be tested without a database.
 */

/** The subset of a diary row this module reads. */
export interface EnaploDiarySource {
  id: number;
  date: Date | string;
  description?: string | null;
  weather?: string | null;
  temperature?: number | null;
  progress?: number | null;
  issues?: string | null;
  notes?: string | null;
  workItem?: { id: number; name: string } | null;
  workItemId?: number | null;
  workDiaryItems?: EnaploDiaryItemSource[];
}

export interface EnaploDiaryItemSource {
  workerId: number;
  name?: string | null;
  quantity?: number | null;
  unit?: string | null;
  workHours?: number | null;
}

/** Optional enrichment: role per worker, which the diary rows do not carry. */
export interface EnaploWorkerLookup {
  [workerId: number]: { name?: string | null; role?: string | null };
}

export interface EnaploHeadcountRow {
  role: string;
  names: string[];
}

/** One work item's output for the day, kept per unit — m² and db never add up. */
export interface EnaploPerformanceRow {
  workItemName: string;
  quantities: { amount: number; unit: string }[];
  workHours: number | null;
  progress: number | null;
  descriptions: string[];
}

export interface EnaploIncidentProposal {
  /** Which diary row it came from, so the UI can link back. */
  diaryId: number;
  text: string;
  source: "issues" | "notes";
}

export interface EnaploDailyReport {
  /** Hungarian calendar day, YYYY-MM-DD. The form cannot be backdated, so this is the key. */
  date: string;
  weather: string | null;
  temperature: number | null;
  /** Conflicting weather across the day's rows; the user picks one for the form. */
  weatherConflicts: string[];
  headcount: EnaploHeadcountRow[];
  headcountTotal: number;
  performance: EnaploPerformanceRow[];
  incidentProposals: EnaploIncidentProposal[];
  diaryIds: number[];
}

const BUDAPEST = "Europe/Budapest";

/**
 * The Hungarian calendar day for a timestamp.
 *
 * The napi jelentés is tied to the day the work happened and explicitly cannot be
 * backdated, so a row stored at 22:00 UTC has to land on the next Hungarian day rather
 * than the UTC one. 'sv-SE' is used purely because it formats as YYYY-MM-DD.
 */
export function budapestDayKey(value: Date | string): string {
  const date = value instanceof Date ? value : new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return new Intl.DateTimeFormat("sv-SE", {
    timeZone: BUDAPEST,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(date);
}

function cleanText(value: unknown): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed === "" ? null : trimmed;
}

function firstNumber(values: (number | null | undefined)[]): number | null {
  for (const value of values) {
    if (typeof value === "number" && Number.isFinite(value)) return value;
  }
  return null;
}

/** Sums amounts per unit, leaving incompatible units side by side. */
function sumByUnit(items: EnaploDiaryItemSource[]): { amount: number; unit: string }[] {
  const totals = new Map<string, number>();
  for (const item of items) {
    const amount = typeof item.quantity === "number" && Number.isFinite(item.quantity)
      ? item.quantity
      : null;
    if (amount === null || amount === 0) continue;
    const unit = cleanText(item.unit) ?? "";
    totals.set(unit, (totals.get(unit) ?? 0) + amount);
  }
  return [...totals.entries()]
    .map(([unit, amount]) => ({ amount, unit }))
    .sort((a, b) => a.unit.localeCompare(b.unit, "hu"));
}

/**
 * Groups diary rows into one report per Hungarian calendar day, newest first.
 *
 * The headcount counts distinct workers that have logged work that day. That is
 * narrower than what the form asks for — the regulation wants everyone present,
 * including technical and administrative staff who never appear in a diary item — so
 * callers should present it as a starting number the user completes, not a final one.
 */
export function buildDailyReports(
  diaries: EnaploDiarySource[],
  workers: EnaploWorkerLookup = {}
): EnaploDailyReport[] {
  const byDay = new Map<string, EnaploDiarySource[]>();

  for (const diary of diaries) {
    const key = budapestDayKey(diary.date);
    if (key === "") continue;
    const bucket = byDay.get(key);
    if (bucket) bucket.push(diary);
    else byDay.set(key, [diary]);
  }

  const reports: EnaploDailyReport[] = [];

  for (const [date, rows] of byDay) {
    // Weather is a property of the day, but it is stored per row, so rows can disagree.
    const weathers = [...new Set(rows.map((r) => cleanText(r.weather)).filter((w): w is string => w !== null))];

    // One worker can appear under several work items in a day; the form wants people, not entries.
    const seenWorkers = new Set<number>();
    const byRole = new Map<string, string[]>();
    for (const row of rows) {
      for (const item of row.workDiaryItems ?? []) {
        if (seenWorkers.has(item.workerId)) continue;
        seenWorkers.add(item.workerId);
        const known = workers[item.workerId];
        const name = cleanText(item.name) ?? cleanText(known?.name) ?? `#${item.workerId}`;
        const role = cleanText(known?.role) ?? "";
        const bucket = byRole.get(role);
        if (bucket) bucket.push(name);
        else byRole.set(role, [name]);
      }
    }

    // Several diary rows can point at the same work item within a day.
    const byWorkItem = new Map<string, EnaploDiarySource[]>();
    for (const row of rows) {
      const name = cleanText(row.workItem?.name) ?? "";
      const bucket = byWorkItem.get(name);
      if (bucket) bucket.push(row);
      else byWorkItem.set(name, [row]);
    }

    const performance: EnaploPerformanceRow[] = [...byWorkItem.entries()].map(
      ([workItemName, itemRows]) => {
        const items = itemRows.flatMap((r) => r.workDiaryItems ?? []);
        const hours = items.reduce(
          (sum, i) =>
            typeof i.workHours === "number" && Number.isFinite(i.workHours) ? sum + i.workHours : sum,
          0
        );
        return {
          workItemName,
          quantities: sumByUnit(items),
          workHours: hours > 0 ? hours : null,
          progress: firstNumber(itemRows.map((r) => r.progress)),
          descriptions: itemRows
            .map((r) => cleanText(r.description))
            .filter((d): d is string => d !== null),
        };
      }
    );

    // Offered, never assumed: an eseti bejegyzés is a legal record with its own
    // categories, so the user decides whether a logged problem rises to one.
    const incidentProposals: EnaploIncidentProposal[] = [];
    for (const row of rows) {
      const issues = cleanText(row.issues);
      if (issues) incidentProposals.push({ diaryId: row.id, text: issues, source: "issues" });
      const notes = cleanText(row.notes);
      if (notes) incidentProposals.push({ diaryId: row.id, text: notes, source: "notes" });
    }

    reports.push({
      date,
      weather: weathers[0] ?? null,
      weatherConflicts: weathers.slice(1),
      temperature: firstNumber(rows.map((r) => r.temperature)),
      headcount: [...byRole.entries()]
        .map(([role, names]) => ({ role, names: names.sort((a, b) => a.localeCompare(b, "hu")) }))
        .sort((a, b) => a.role.localeCompare(b.role, "hu")),
      headcountTotal: seenWorkers.size,
      performance: performance.sort((a, b) => a.workItemName.localeCompare(b.workItemName, "hu")),
      incidentProposals,
      diaryIds: rows.map((r) => r.id),
    });
  }

  return reports.sort((a, b) => b.date.localeCompare(a.date));
}

function formatAmount(amount: number): string {
  return Number.isInteger(amount) ? String(amount) : String(Number(amount.toFixed(2)));
}

/**
 * The "napi teljesítmény adatok" free-text block, ready to paste into ÁNYK.
 *
 * The form has one narrative field for the day's output rather than a row per work
 * item, so the items are flattened into lines.
 */
export function renderPerformanceText(report: EnaploDailyReport): string {
  const lines: string[] = [];
  for (const row of report.performance) {
    const parts: string[] = [];
    const quantities = row.quantities
      .map((q) => `${formatAmount(q.amount)}${q.unit ? ` ${q.unit}` : ""}`)
      .join(", ");
    if (quantities) parts.push(quantities);
    if (row.workHours !== null) parts.push(`${formatAmount(row.workHours)} óra`);
    if (row.progress !== null) parts.push(`készültség ${formatAmount(row.progress)}%`);

    const head = row.workItemName || "Egyéb munka";
    lines.push(parts.length > 0 ? `${head}: ${parts.join(", ")}` : head);
    for (const description of row.descriptions) lines.push(`  ${description}`);
  }
  return lines.join("\n");
}

/** The "napi létszám" block: one line per role, then the total. */
export function renderHeadcountText(report: EnaploDailyReport): string {
  const lines = report.headcount.map(
    (row) => `${row.role || "Besorolás nélkül"}: ${row.names.length} fő (${row.names.join(", ")})`
  );
  lines.push(`Összesen: ${report.headcountTotal} fő`);
  return lines.join("\n");
}

/** The weather line, which the form takes as its own field. */
export function renderWeatherText(report: EnaploDailyReport): string {
  const parts: string[] = [];
  if (report.weather) parts.push(report.weather);
  if (report.temperature !== null) parts.push(`${formatAmount(report.temperature)} °C`);
  return parts.join(", ");
}
