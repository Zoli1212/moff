"use client";

import { useState, useTransition } from "react";
import { Copy, KeyRound, Plus, Trash2, TriangleAlert } from "lucide-react";
import { useLocale } from "@/components/i18n/LocaleProvider";
import {
  createPayrollApiKey,
  revokePayrollApiKey,
  type PayrollApiKeyView,
} from "@/actions/payroll-api-key-actions";

interface Props {
  initialKeys: PayrollApiKeyView[];
  /** Az abszolút végpont, amit a könyvelőnek meg kell adni. */
  endpoint: string;
}

/**
 * A lekérő API kulcsai.
 *
 * A nyers kulcs EGYSZER látható — a létrehozás válaszában. Ezért marad a
 * képernyőn, kimásolható dobozban, amíg a felhasználó el nem tünteti; ha
 * elnavigál nélküle, újat kell kérnie. Ez szándékos: a hash-elt tárolás
 * mellett nincs mód visszaadni.
 */
export default function PayrollApiKeys({ initialKeys, endpoint }: Props) {
  const { t } = useLocale();
  const [keys, setKeys] = useState(initialKeys);
  const [name, setName] = useState("");
  const [fresh, setFresh] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  const handleCreate = () => {
    setError(null);
    startTransition(async () => {
      const result = await createPayrollApiKey(name);
      if (!result.success || !result.plaintext) {
        setError(result.error ?? t("payrollKeys.createFailed"));
        return;
      }
      setFresh(result.plaintext);
      setName("");
      const list = await import("@/actions/payroll-api-key-actions").then((m) =>
        m.listPayrollApiKeys(),
      );
      if (list.success && list.keys) setKeys(list.keys);
    });
  };

  const handleRevoke = (id: string) => {
    setError(null);
    startTransition(async () => {
      const result = await revokePayrollApiKey(id);
      if (!result.success) {
        setError(result.error ?? t("payrollKeys.revokeFailed"));
        return;
      }
      setKeys((prev) => prev.filter((key) => key.id !== id));
    });
  };

  return (
    <section className="mt-8 rounded-lg border border-gray-200 p-4">
      <div className="flex items-start gap-2">
        <KeyRound className="mt-0.5 h-4 w-4 shrink-0 text-gray-500" />
        <div className="min-w-0 flex-1">
          <h2 className="text-sm font-semibold text-gray-800">{t("payrollKeys.title")}</h2>
          <p className="mt-1 text-sm text-gray-600">{t("payrollKeys.intro")}</p>

          <div className="mt-2 overflow-x-auto rounded border border-gray-200 bg-gray-50 p-2">
            <code className="whitespace-pre text-xs text-gray-700">
              {`GET ${endpoint}?month=2026-09\nAuthorization: Bearer ofpay_…`}
            </code>
          </div>
        </div>
      </div>

      {/* A frissen létrehozott kulcs — ez az egyetlen alkalom, amikor látszik. */}
      {fresh && (
        <div className="mt-3 rounded-md border border-amber-300 bg-amber-50 p-3">
          <div className="flex items-start gap-2">
            <TriangleAlert className="mt-0.5 h-4 w-4 shrink-0 text-amber-700" />
            <div className="min-w-0 flex-1">
              <p className="text-sm font-semibold text-amber-900">
                {t("payrollKeys.copyNow")}
              </p>
              <div className="mt-1.5 flex items-center gap-2">
                <code className="min-w-0 flex-1 truncate rounded border border-amber-300 bg-white px-2 py-1 font-mono text-xs">
                  {fresh}
                </code>
                <button
                  type="button"
                  onClick={() => void navigator.clipboard.writeText(fresh)}
                  className="inline-flex shrink-0 items-center gap-1 rounded border border-amber-300 bg-white px-2 py-1 text-xs font-medium text-amber-900 hover:bg-amber-100"
                >
                  <Copy className="h-3.5 w-3.5" />
                  {t("payrollKeys.copy")}
                </button>
              </div>
              <button
                type="button"
                onClick={() => setFresh(null)}
                className="mt-2 text-xs text-amber-800 underline underline-offset-2"
              >
                {t("payrollKeys.saved")}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="mt-3 flex flex-wrap items-center gap-2">
        <input
          type="text"
          value={name}
          onChange={(event) => setName(event.target.value)}
          placeholder={t("payrollKeys.namePlaceholder")}
          className="min-w-0 flex-1 rounded-md border border-gray-300 px-2 py-1.5 text-sm"
          disabled={pending}
        />
        <button
          type="button"
          onClick={handleCreate}
          disabled={pending || name.trim().length === 0}
          className="inline-flex items-center gap-1.5 rounded-md bg-gray-900 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-gray-800 disabled:opacity-40"
        >
          <Plus className="h-4 w-4" />
          {t("payrollKeys.create")}
        </button>
      </div>

      {error && <p className="mt-2 text-sm text-red-700">{error}</p>}

      {keys.length === 0 ? (
        <p className="mt-3 text-sm text-gray-500">{t("payrollKeys.empty")}</p>
      ) : (
        <ul className="mt-3 divide-y divide-gray-100 rounded border border-gray-200">
          {keys.map((key) => (
            <li key={key.id} className="flex items-center justify-between gap-2 px-3 py-2">
              <div className="min-w-0">
                <p className="truncate text-sm font-medium text-gray-800">{key.name}</p>
                <p className="text-xs text-gray-500">
                  <span className="font-mono">{key.keyPrefix}…</span>
                  {" · "}
                  {key.lastUsedAt
                    ? t("payrollKeys.lastUsed", { date: key.lastUsedAt.slice(0, 10) })
                    : t("payrollKeys.neverUsed")}
                </p>
              </div>
              <button
                type="button"
                onClick={() => handleRevoke(key.id)}
                disabled={pending}
                className="inline-flex shrink-0 items-center gap-1 rounded border border-gray-300 px-2 py-1 text-xs text-red-700 hover:bg-red-50"
              >
                <Trash2 className="h-3.5 w-3.5" />
                {t("payrollKeys.revoke")}
              </button>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
