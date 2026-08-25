/**
 * Pure aggregation behind the workforce ranking.
 *
 * Nothing here is stored: the ranking is derived from diary entries on every request.
 * That keeps the feature purely additive - no table, no migration, and no way for it to
 * corrupt the records it reads.
 *
 * Every metric is unit-independent on purpose. Diary quantities mix square metres, pieces
 * and running metres across trades, so any "output per hour" comparison between a tiler
 * and a door fitter would be arithmetic without meaning. Hours, days, acceptance and
 * breadth are comparable for everyone.
 */

export interface DiaryEntryInput {
  workforceRegistryId: number | null;
  workId: number | null;
  date: Date;
  workHours: number | null;
  accepted: boolean;
}

export interface WorkerRef {
  id: number;
  name: string;
  role: string;
  avatarUrl: string | null;
}

export interface WorkerStats {
  worker: WorkerRef;
  entries: number;
  hours: number;
  activeDays: number;
  worksCount: number;
  acceptedEntries: number;
  /** 0-100, or null when nothing has been logged yet. */
  acceptanceRate: number | null;
  /** Position within the worker's own trade, 1-based. */
  rankInRole: number;
}

export interface RoleGroup {
  role: string;
  headcount: number;
  totalHours: number;
  totalEntries: number;
  /** Average of the group's acceptance, weighted by entry count. */
  acceptanceRate: number | null;
  members: WorkerStats[];
}

export interface RankingCoverage {
  totalEntries: number;
  attributedEntries: number;
  /** 0-100. Below 100 means some logged work cannot be credited to a named person. */
  attributedPercent: number;
}

export const RANKING_METRICS = [
  "hours",
  "activeDays",
  "acceptanceRate",
  "worksCount",
] as const;

export type RankingMetric = (typeof RANKING_METRICS)[number];

export const METRIC_LABELS: Record<RankingMetric, string> = {
  hours: "Ledolgozott óra",
  activeDays: "Aktív napok",
  acceptanceRate: "Elfogadási arány",
  worksCount: "Munkák száma",
};

export function isRankingMetric(value: unknown): value is RankingMetric {
  return (
    typeof value === "string" && (RANKING_METRICS as readonly string[]).includes(value)
  );
}

function metricValue(stats: WorkerStats, metric: RankingMetric): number {
  switch (metric) {
    case "hours":
      return stats.hours;
    case "activeDays":
      return stats.activeDays;
    case "worksCount":
      return stats.worksCount;
    case "acceptanceRate":
      return stats.acceptanceRate ?? -1;
  }
}

/** Days are compared by calendar date in UTC, so one long shift never counts twice. */
function dayKey(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/**
 * Builds per-person statistics and groups them by trade.
 *
 * Workers with no diary entries are included with zeroes rather than omitted: "has logged
 * nothing" is itself worth seeing on a performance screen, and silently dropping people
 * would make the roster look smaller than it is.
 */
export function buildRanking(
  entries: ReadonlyArray<DiaryEntryInput>,
  workers: ReadonlyArray<WorkerRef>,
  metric: RankingMetric
): { groups: RoleGroup[]; coverage: RankingCoverage } {
  const byWorker = new Map<
    number,
    {
      entries: number;
      hours: number;
      days: Set<string>;
      works: Set<number>;
      accepted: number;
    }
  >();

  let attributed = 0;

  for (const entry of entries) {
    if (entry.workforceRegistryId == null) continue;
    attributed += 1;

    let bucket = byWorker.get(entry.workforceRegistryId);
    if (!bucket) {
      bucket = {
        entries: 0,
        hours: 0,
        days: new Set(),
        works: new Set(),
        accepted: 0,
      };
      byWorker.set(entry.workforceRegistryId, bucket);
    }

    bucket.entries += 1;
    bucket.hours += entry.workHours ?? 0;
    bucket.days.add(dayKey(entry.date));
    if (entry.workId != null) bucket.works.add(entry.workId);
    if (entry.accepted) bucket.accepted += 1;
  }

  const stats: WorkerStats[] = workers.map((worker) => {
    const bucket = byWorker.get(worker.id);
    const entryCount = bucket?.entries ?? 0;
    return {
      worker,
      entries: entryCount,
      // Rounded to one decimal: diary hours accumulate float noise (219.9999...).
      hours: Math.round((bucket?.hours ?? 0) * 10) / 10,
      activeDays: bucket?.days.size ?? 0,
      worksCount: bucket?.works.size ?? 0,
      acceptedEntries: bucket?.accepted ?? 0,
      acceptanceRate: entryCount
        ? Math.round(((bucket?.accepted ?? 0) / entryCount) * 100)
        : null,
      rankInRole: 0,
    };
  });

  const byRole = new Map<string, WorkerStats[]>();
  for (const entry of stats) {
    const role = entry.worker.role?.trim() || "Egyéb";
    const list = byRole.get(role);
    if (list) list.push(entry);
    else byRole.set(role, [entry]);
  }

  const groups: RoleGroup[] = [];

  for (const [role, members] of byRole) {
    members.sort((a, b) => {
      const diff = metricValue(b, metric) - metricValue(a, metric);
      // Entry count breaks ties before the name does, so someone with a perfect
      // acceptance rate over two entries does not outrank a steady contributor.
      if (diff !== 0) return diff;
      if (b.entries !== a.entries) return b.entries - a.entries;
      return a.worker.name.localeCompare(b.worker.name, "hu");
    });

    members.forEach((member, index) => {
      member.rankInRole = index + 1;
    });

    const totalEntries = members.reduce((sum, member) => sum + member.entries, 0);
    const totalAccepted = members.reduce(
      (sum, member) => sum + member.acceptedEntries,
      0
    );

    groups.push({
      role,
      headcount: members.length,
      totalHours: Math.round(members.reduce((sum, m) => sum + m.hours, 0) * 10) / 10,
      totalEntries,
      acceptanceRate: totalEntries
        ? Math.round((totalAccepted / totalEntries) * 100)
        : null,
      members,
    });
  }

  // Busiest trades first, so the screen opens on where the work actually happened.
  groups.sort((a, b) => b.totalEntries - a.totalEntries || b.headcount - a.headcount);

  return {
    groups,
    coverage: {
      totalEntries: entries.length,
      attributedEntries: attributed,
      attributedPercent: entries.length
        ? Math.round((attributed / entries.length) * 100)
        : 100,
    },
  };
}

/** Flattens the groups into one list, for the "everyone" view. */
export function flattenRanking(groups: ReadonlyArray<RoleGroup>): WorkerStats[] {
  return groups.flatMap((group) => group.members);
}
