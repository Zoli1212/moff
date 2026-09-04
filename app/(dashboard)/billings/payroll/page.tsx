import { headers } from "next/headers";

import { getPayrollRun } from "@/actions/payroll-actions";
import { listPayrollApiKeys } from "@/actions/payroll-api-key-actions";
import { CANDIDATE_SYSTEMS } from "@/lib/payroll/providers";
import PayrollApiKeys from "./PayrollApiKeys";
import PayrollClient from "./PayrollClient";

interface PayrollPageProps {
  searchParams: Promise<{ month?: string }>;
}

export default async function PayrollPage({ searchParams }: PayrollPageProps) {
  const { month } = await searchParams;
  const [result, keys] = await Promise.all([
    getPayrollRun(month),
    listPayrollApiKeys(),
  ]);

  // A könyvelőnek a teljes URL kell — a kérés fejlécéből olvassuk ki, hogy
  // ne kelljen külön beállítani se fejlesztésben, se élesben.
  const headerList = await headers();
  const host = headerList.get("host") ?? "";
  const protocol = host.startsWith("localhost") ? "http" : "https";
  const endpoint = `${protocol}://${host}/api/payroll/run`;

  return (
    <>
      <PayrollClient
        run={result.run ?? null}
        month={result.month ?? ""}
        providerName={result.providerName ?? null}
        error={result.error ?? null}
        candidates={[...CANDIDATE_SYSTEMS]}
      />
      <div className="mx-auto w-full max-w-3xl px-3 pb-24 sm:px-4">
        <PayrollApiKeys initialKeys={keys.keys ?? []} endpoint={endpoint} />
      </div>
    </>
  );
}
