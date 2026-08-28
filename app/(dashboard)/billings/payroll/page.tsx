import { getPayrollRun } from "@/actions/payroll-actions";
import { CANDIDATE_SYSTEMS } from "@/lib/payroll/providers";
import PayrollClient from "./PayrollClient";

interface PayrollPageProps {
  searchParams: Promise<{ month?: string }>;
}

export default async function PayrollPage({ searchParams }: PayrollPageProps) {
  const { month } = await searchParams;
  const result = await getPayrollRun(month);

  return (
    <PayrollClient
      run={result.run ?? null}
      month={result.month ?? ""}
      providerName={result.providerName ?? null}
      error={result.error ?? null}
      candidates={[...CANDIDATE_SYSTEMS]}
    />
  );
}
