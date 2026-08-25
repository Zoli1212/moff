"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import {
  AlertTriangle,
  ArrowLeft,
  CalendarClock,
  Layers,
  Lightbulb,
  Loader2,
  Scissors,
  Sparkles,
  Trash2,
} from "lucide-react";
import DeleteConfirmModal from "@/components/ui/delete-confirm-modal";
import {
  SCOPE_ACTION_LABELS,
  totalClaimedSavings,
  type OfferScenarioDto,
} from "@/lib/offer-scenario/schema";
import {
  createOfferScenario,
  deleteOfferScenario,
  getOfferScenarios,
} from "@/actions/offer-scenario-actions";

const BRAND = "#FE9C00";

/** Starting points, because a blank box is the hardest thing to answer. */
const EXAMPLES = [
  "Csak 2 emberem van a tervezett 4 helyett",
  "Feleannyi pénzből kellene kijönni",
  "Két héttel korábban kész kell lennie",
  "Nincs gépi bontásra eszközöm",
];

export default function ScenariosClient({
  offerId,
  requirementId,
}: {
  offerId: number;
  requirementId: string;
}) {
  const queryClient = useQueryClient();
  const [constraint, setConstraint] = useState("");
  const [deleting, setDeleting] = useState<OfferScenarioDto | null>(null);
  const [isPending, startTransition] = useTransition();

  const query = useQuery({
    queryKey: ["offer-scenarios", offerId],
    queryFn: () => getOfferScenarios(offerId),
  });

  const refresh = () =>
    queryClient.invalidateQueries({ queryKey: ["offer-scenarios", offerId] });

  const scenarios = query.data?.scenarios ?? [];

  const generate = () => {
    const text = constraint.trim();
    if (!text) {
      toast.error("Írd le, mi a megszorítás.");
      return;
    }
    startTransition(async () => {
      const result = await createOfferScenario(offerId, text);
      if (!result.success) {
        toast.error(result.error ?? "Az elemzés nem sikerült.");
        return;
      }
      toast.success("Elemzés elkészült.");
      setConstraint("");
      refresh();
    });
  };

  const remove = () => {
    if (!deleting) return;
    const id = deleting.id;
    startTransition(async () => {
      const result = await deleteOfferScenario(id);
      setDeleting(null);
      if (!result.success) {
        toast.error(result.error ?? "A törlés nem sikerült.");
        return;
      }
      refresh();
    });
  };

  if (query.data && !query.data.success) {
    return (
      <div className="mx-auto max-w-[900px] px-4 py-10">
        <div className="rounded-xl border border-amber-200 bg-amber-50 p-5">
          <p className="text-sm text-amber-900">{query.data.error}</p>
          <Link
            href={`/offers/${requirementId}`}
            className="mt-3 inline-block text-sm font-medium"
            style={{ color: BRAND }}
          >
            Vissza az ajánlatokhoz
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto w-full max-w-[900px] px-4 pb-24">
      <header className="flex items-center gap-3 pt-6">
        <Link
          href={`/offers/${requirementId}`}
          aria-label="Vissza az ajánlatokhoz"
          className="flex h-9 w-9 items-center justify-center rounded-full hover:bg-gray-100"
          style={{ color: BRAND }}
        >
          <ArrowLeft className="h-5 w-5" />
        </Link>
        <div className="min-w-0">
          <h1 className="truncate text-lg font-semibold text-gray-900">
            Alternatívák
          </h1>
          {query.data?.offerTitle && (
            <p className="truncate text-xs text-gray-500">
              {query.data.offerTitle}
            </p>
          )}
        </div>
      </header>

      <p className="mt-4 rounded-lg border-l-4 border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-900">
        Itt <strong>nem készül új ajánlat</strong>. Az AI elolvassa a meglévő ajánlatot
        és az eredeti igényt, majd megmutatja, mi a mozgástered a megadott korlát mellett.
        Az ajánlaton semmi nem változik.
      </p>

      <section className="mt-5 rounded-xl border border-gray-200 bg-white p-4">
        <label
          htmlFor="constraint"
          className="mb-2 block text-sm font-medium text-gray-800"
        >
          Mi a megszorítás?
        </label>
        <textarea
          id="constraint"
          rows={2}
          value={constraint}
          onChange={(event) => setConstraint(event.target.value)}
          maxLength={500}
          placeholder="pl. Csak 2 emberem van, és nincs gépi bontásra eszközöm"
          className="w-full rounded-md border border-gray-300 px-3 py-2 text-sm focus:border-[#FE9C00] focus:outline-none focus:ring-1 focus:ring-[#FE9C00]"
        />

        <div className="mt-2 flex flex-wrap gap-1.5">
          {EXAMPLES.map((example) => (
            <button
              key={example}
              type="button"
              onClick={() => setConstraint(example)}
              className="rounded-full border border-gray-200 px-2.5 py-1 text-xs text-gray-600 hover:bg-gray-50"
            >
              {example}
            </button>
          ))}
        </div>

        <button
          type="button"
          onClick={generate}
          disabled={isPending}
          className="mt-3 flex items-center gap-1.5 rounded-full bg-[#FE9C00] px-4 py-2 text-sm font-medium text-white hover:bg-[#FE9C00]/90 disabled:opacity-60"
        >
          {isPending ? (
            <Loader2 className="h-4 w-4 animate-spin" />
          ) : (
            <Sparkles className="h-4 w-4" />
          )}
          {isPending ? "Elemzés…" : "Alternatívák kérése"}
        </button>
      </section>

      {query.isLoading ? (
        <div className="mt-6 h-40 animate-pulse rounded-xl bg-gray-100" />
      ) : scenarios.length === 0 ? (
        <p className="mt-8 text-center text-sm text-gray-500">
          Még nincs elemzés. Írd le fent, mi szorít, és kérj alternatívákat.
        </p>
      ) : (
        <div className="mt-6 space-y-4">
          {scenarios.map((scenario) => (
            <ScenarioCard
              key={scenario.id}
              scenario={scenario}
              onDelete={() => setDeleting(scenario)}
            />
          ))}
        </div>
      )}

      <DeleteConfirmModal
        isOpen={Boolean(deleting)}
        onClose={() => setDeleting(null)}
        onConfirm={remove}
        isLoading={isPending}
        title="Elemzés törlése"
        message={`A(z) „${deleting?.constraint ?? ""}" elemzés törlődik. Az ajánlatot ez nem érinti.`}
      />
    </div>
  );
}

function ScenarioCard({
  scenario,
  onDelete,
}: {
  scenario: OfferScenarioDto;
  onDelete: () => void;
}) {
  const { analysis } = scenario;
  const savings = totalClaimedSavings(analysis);
  const originalDays = analysis.durationImpact.originalDays;
  const dayDelta =
    originalDays != null ? analysis.durationImpact.adjustedDays - originalDays : null;

  return (
    <article className="rounded-xl border border-gray-200 bg-white p-4">
      <div className="flex items-start gap-3">
        <div className="min-w-0 flex-1">
          <p className="text-sm font-semibold text-gray-900">
            &bdquo;{scenario.constraint}&rdquo;
          </p>
          <p className="mt-0.5 text-xs text-gray-400">
            {new Date(scenario.createdAt).toLocaleString("hu-HU")}
          </p>
        </div>
        <button
          type="button"
          onClick={onDelete}
          aria-label="Elemzés törlése"
          className="text-gray-300 hover:text-red-600"
        >
          <Trash2 className="h-4 w-4" />
        </button>
      </div>

      {scenario.offerChangedSince && (
        <p className="mt-2 flex items-start gap-1.5 rounded-md bg-amber-50 px-2.5 py-1.5 text-xs text-amber-800">
          <AlertTriangle className="mt-0.5 h-3.5 w-3.5 shrink-0" />
          Az ajánlat azóta megváltozott. Ez az elemzés a korábbi,{" "}
          {Math.round(scenario.baseTotalPrice).toLocaleString("hu-HU")} Ft-os
          változatra készült.
        </p>
      )}

      <p className="mt-3 text-sm leading-relaxed text-gray-700">
        {analysis.summary}
      </p>

      <div className="mt-3 flex flex-wrap gap-2">
        <Stat
          icon={<CalendarClock className="h-3.5 w-3.5" />}
          label="Átfutás"
          value={
            dayDelta != null
              ? `${originalDays} → ${analysis.durationImpact.adjustedDays} nap (${dayDelta >= 0 ? "+" : ""}${dayDelta})`
              : `${analysis.durationImpact.adjustedDays} nap`
          }
        />
        {savings > 0 && (
          <Stat
            icon={<Scissors className="h-3.5 w-3.5" />}
            label="Felszabadítható"
            value={`${Math.round(savings).toLocaleString("hu-HU")} Ft`}
          />
        )}
      </div>

      {analysis.durationImpact.explanation && (
        <p className="mt-2 text-xs leading-relaxed text-gray-600">
          {analysis.durationImpact.explanation}
        </p>
      )}

      {analysis.phases?.length ? (
        <Section icon={<Layers className="h-4 w-4" />} title="Ütemekre bontás">
          <ol className="space-y-2">
            {analysis.phases.map((phase, index) => (
              <li key={`${phase.name}-${index}`}>
                <p className="text-sm font-medium text-gray-900">
                  {index + 1}. {phase.name}
                </p>
                {phase.itemNames?.length ? (
                  <p className="text-xs text-gray-500">
                    {phase.itemNames.join(" · ")}
                  </p>
                ) : null}
                <p className="text-xs text-gray-600">{phase.rationale}</p>
              </li>
            ))}
          </ol>
        </Section>
      ) : null}

      {analysis.scopeCuts?.length ? (
        <Section icon={<Scissors className="h-4 w-4" />} title="Elhagyható vagy halasztható">
          <ul className="space-y-2">
            {analysis.scopeCuts.map((cut, index) => (
              <li key={`${cut.itemName}-${index}`} className="flex gap-2">
                <span
                  className={`mt-0.5 h-fit shrink-0 rounded px-1.5 py-0.5 text-[10px] font-medium ${
                    cut.action === "drop"
                      ? "bg-red-50 text-red-700"
                      : "bg-amber-50 text-amber-700"
                  }`}
                >
                  {SCOPE_ACTION_LABELS[cut.action]}
                </span>
                <div className="min-w-0">
                  <p className="text-sm text-gray-900">
                    {cut.itemName}
                    {cut.savedAmount != null && (
                      <span className="ml-1 text-xs text-gray-500">
                        ({Math.round(cut.savedAmount).toLocaleString("hu-HU")} Ft)
                      </span>
                    )}
                  </p>
                  <p className="text-xs text-gray-600">{cut.rationale}</p>
                </div>
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {analysis.alternatives?.length ? (
        <Section icon={<Lightbulb className="h-4 w-4" />} title="Más megoldás">
          <ul className="space-y-2">
            {analysis.alternatives.map((alternative, index) => (
              <li key={`${alternative.itemName}-${index}`}>
                <p className="text-sm text-gray-900">
                  <span className="font-medium">{alternative.itemName}:</span>{" "}
                  {alternative.proposal}
                </p>
                {alternative.tradeoff && (
                  <p className="text-xs text-amber-700">
                    Cserébe: {alternative.tradeoff}
                  </p>
                )}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}

      {analysis.risks?.length ? (
        <Section
          icon={<AlertTriangle className="h-4 w-4" />}
          title="Amit kockáztatsz"
        >
          <ul className="list-disc space-y-1 pl-4">
            {analysis.risks.map((risk, index) => (
              <li key={index} className="text-xs text-gray-700">
                {risk}
              </li>
            ))}
          </ul>
        </Section>
      ) : null}
    </article>
  );
}

function Stat({
  icon,
  label,
  value,
}: {
  icon: React.ReactNode;
  label: string;
  value: string;
}) {
  return (
    <span className="flex items-center gap-1.5 rounded-full bg-gray-50 px-2.5 py-1 text-xs text-gray-700">
      <span className="text-gray-400">{icon}</span>
      <span className="text-gray-500">{label}:</span>
      <span className="font-medium">{value}</span>
    </span>
  );
}

function Section({
  icon,
  title,
  children,
}: {
  icon: React.ReactNode;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mt-4 border-t border-gray-100 pt-3">
      <h3 className="mb-2 flex items-center gap-1.5 text-xs font-semibold uppercase tracking-wide text-gray-500">
        <span className="text-gray-400">{icon}</span>
        {title}
      </h3>
      {children}
    </div>
  );
}
