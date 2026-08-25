"use server";

/**
 * Read-only workforce ranking.
 *
 * Purely additive: this module has no create, update or delete of any kind. It derives
 * statistics from diary entries that already exist and stores nothing, so it cannot
 * affect a single existing record.
 *
 * Only async functions may be exported from a "use server" module - the aggregation and
 * its types live in lib/workforce-ranking/schema.ts.
 */

import { prisma } from "@/lib/prisma";
import { getTenantSafeAuth } from "@/lib/tenant-auth";
import {
  buildRanking,
  isRankingMetric,
  type RankingCoverage,
  type RankingMetric,
  type RoleGroup,
} from "@/lib/workforce-ranking/schema";

/** Windows offered in the UI. "all" keeps every entry. */
const PERIOD_DAYS: Record<string, number | null> = {
  "30": 30,
  "90": 90,
  "365": 365,
  all: null,
};

export async function getWorkforceRanking(options?: {
  metric?: string;
  period?: string;
}): Promise<{
  success: boolean;
  error?: string;
  groups?: RoleGroup[];
  coverage?: RankingCoverage;
  metric?: RankingMetric;
  period?: string;
}> {
  try {
    const { tenantEmail } = await getTenantSafeAuth();

    const metric: RankingMetric = isRankingMetric(options?.metric)
      ? options.metric
      : "hours";

    const period =
      options?.period && options.period in PERIOD_DAYS ? options.period : "90";
    const days = PERIOD_DAYS[period];

    const since = days
      ? new Date(Date.now() - days * 24 * 60 * 60 * 1000)
      : undefined;

    const [entries, workers] = await Promise.all([
      prisma.workDiaryItem.findMany({
        where: {
          tenantEmail,
          ...(since ? { date: { gte: since } } : {}),
        },
        select: {
          workforceRegistryId: true,
          workId: true,
          date: true,
          workHours: true,
          accepted: true,
        },
      }),
      prisma.workforceRegistry.findMany({
        where: { tenantEmail, isDeleted: false },
        select: { id: true, name: true, role: true, avatarUrl: true },
      }),
    ]);

    const { groups, coverage } = buildRanking(entries, workers, metric);

    return { success: true, groups, coverage, metric, period };
  } catch (error) {
    console.error("[workforce-ranking] failed:", error);
    return {
      success: false,
      error: "A rangsor betöltése nem sikerült. Próbáld újra.",
    };
  }
}
