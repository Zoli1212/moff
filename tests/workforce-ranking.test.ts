import { describe, expect, it } from "vitest";
import { buildRanking, type WorkerRef } from "../lib/workforce-ranking/schema";

const workers: WorkerRef[] = [
  { id: 1, name: "Kovács Béla", role: "kőműves", avatarUrl: null },
  { id: 2, name: "Nagy Áron", role: "kőműves", avatarUrl: null },
  { id: 3, name: "Szabó Ede", role: "burkoló", avatarUrl: null },
  { id: 4, name: "Tóth Imre", role: "burkoló", avatarUrl: null },
];

function entry(
  workforceRegistryId: number | null,
  date: string,
  workHours: number | null,
  accepted = true,
  workId: number | null = 100
) {
  return {
    workforceRegistryId,
    workId,
    date: new Date(date),
    workHours,
    accepted,
  };
}

describe("buildRanking", () => {
  it("ranks within a trade, not across trades", () => {
    const { groups } = buildRanking(
      [
        entry(1, "2026-08-01T06:00:00Z", 8),
        entry(1, "2026-08-02T06:00:00Z", 8),
        // The tiler logs far more hours, but must not outrank inside the masons.
        entry(3, "2026-08-01T06:00:00Z", 12),
        entry(3, "2026-08-02T06:00:00Z", 12),
        entry(3, "2026-08-03T06:00:00Z", 12),
        entry(2, "2026-08-01T06:00:00Z", 4),
      ],
      workers,
      "hours"
    );

    const masons = groups.find((group) => group.role === "kőműves");
    expect(masons?.members.map((m) => m.worker.name)).toEqual([
      "Kovács Béla",
      "Nagy Áron",
    ]);
    expect(masons?.members[0].rankInRole).toBe(1);

    const tilers = groups.find((group) => group.role === "burkoló");
    expect(tilers?.members[0].worker.name).toBe("Szabó Ede");
    expect(tilers?.members[0].rankInRole).toBe(1);
  });

  it("counts a calendar day once even with several entries", () => {
    const { groups } = buildRanking(
      [
        entry(1, "2026-08-01T06:00:00Z", 4),
        entry(1, "2026-08-01T14:00:00Z", 4),
        entry(1, "2026-08-02T06:00:00Z", 8),
      ],
      workers,
      "activeDays"
    );

    const bela = groups
      .flatMap((group) => group.members)
      .find((member) => member.worker.id === 1);

    expect(bela?.activeDays).toBe(2);
    expect(bela?.hours).toBe(16);
  });

  it("reports how much of the diary could not be attributed", () => {
    const { coverage } = buildRanking(
      [
        entry(1, "2026-08-01T06:00:00Z", 8),
        entry(null, "2026-08-01T06:00:00Z", 8),
        entry(null, "2026-08-02T06:00:00Z", 8),
        entry(2, "2026-08-02T06:00:00Z", 8),
      ],
      workers,
      "hours"
    );

    expect(coverage.totalEntries).toBe(4);
    expect(coverage.attributedEntries).toBe(2);
    expect(coverage.attributedPercent).toBe(50);
  });

  it("does not let a tiny sample win on acceptance rate alone", () => {
    const { groups } = buildRanking(
      [
        // One perfect entry.
        entry(1, "2026-08-01T06:00:00Z", 8, true),
        // Ten entries, also all accepted - the steady contributor should lead.
        ...Array.from({ length: 10 }, (_, index) =>
          entry(2, `2026-08-${String(index + 1).padStart(2, "0")}T06:00:00Z`, 8, true)
        ),
      ],
      workers,
      "acceptanceRate"
    );

    const masons = groups.find((group) => group.role === "kőműves");
    expect(masons?.members[0].worker.name).toBe("Nagy Áron");
  });

  it("keeps workers with no logged entries, marked as having none", () => {
    const { groups } = buildRanking(
      [entry(1, "2026-08-01T06:00:00Z", 8)],
      workers,
      "hours"
    );

    const all = groups.flatMap((group) => group.members);
    expect(all).toHaveLength(4);

    const idle = all.find((member) => member.worker.id === 4);
    expect(idle?.entries).toBe(0);
    expect(idle?.acceptanceRate).toBeNull();
  });

  it("counts distinct works, not entries", () => {
    const { groups } = buildRanking(
      [
        entry(1, "2026-08-01T06:00:00Z", 8, true, 100),
        entry(1, "2026-08-02T06:00:00Z", 8, true, 100),
        entry(1, "2026-08-03T06:00:00Z", 8, true, 200),
      ],
      workers,
      "worksCount"
    );

    const bela = groups
      .flatMap((group) => group.members)
      .find((member) => member.worker.id === 1);

    expect(bela?.worksCount).toBe(2);
    expect(bela?.entries).toBe(3);
  });
});
