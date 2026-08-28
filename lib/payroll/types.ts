/**
 * The seam a payroll system would connect to.
 *
 * Nothing is wired up: no Hungarian payroll product we found publishes a REST API a
 * third party can call. Számlázz.hu has a "Bérszámfejtés" integration category, but the
 * entries in it are payroll programs that connect *to* Számlázz.hu — ARONIC, Cobra
 * Computer, Makrodigit, Novitax NTAX, QualitySoft — not an API Számlázz.hu offers for
 * payroll itself. Számlázz.hu's own API, Számla Agent, is for invoicing.
 *
 * So this defines what we would hand over, and stops exactly where the transport would
 * begin. When a provider does turn up, implementing `PayrollProvider` and registering it
 * is the whole job; nothing above this line has to change.
 */

/** A closed period the payroll run covers, as ISO dates (inclusive). */
export interface PayrollPeriod {
  from: string;
  to: string;
}

/** One worker's line in a payroll run. */
export interface PayrollEntry {
  /** Our registry id, which an adapter maps to the provider's own person id. */
  workforceRegistryId: number | null;
  workerId: number;
  name: string;
  role: string;
  /** Distinct calendar days with logged work — what a daily rate is multiplied by. */
  daysWorked: number;
  /** Summed from the diary; can exceed 8 per day when several items are logged. */
  hoursWorked: number;
  /**
   * Days whose rate we could not establish.
   *
   * Kept separate rather than folded into the gross as zero, because a silent zero in a
   * payroll figure is worse than a stated gap.
   */
  daysWithoutRate: number;
  /** Sum of each worked day's own rate, so a mid-period raise is honoured. */
  grossAmount: number;
  /** Days still awaiting approval in the diary; a payroll run may want to hold these. */
  daysPendingApproval: number;
}

/** Everything a provider would need for one run. */
export interface PayrollRun {
  period: PayrollPeriod;
  entries: PayrollEntry[];
  /** HUF throughout: payroll is settled in forint regardless of the offer's currency. */
  currency: "HUF";
  totalGross: number;
}

export interface PayrollSubmitResult {
  success: boolean;
  /** The provider's own reference for the run, when it returns one. */
  reference?: string;
  error?: string;
}

/**
 * What any payroll integration has to implement.
 *
 * Deliberately small. A payroll system needs to know who worked, how long, and for how
 * much; anything richer is the provider's business, not ours.
 */
export interface PayrollProvider {
  /** Stable key used in configuration, e.g. "novitax". */
  readonly id: string;
  /** Shown in the interface. */
  readonly name: string;
  /** Where an integrator would go to get credentials. */
  readonly docsUrl?: string;
  /** False until credentials are present, so the UI can explain what is missing. */
  isConfigured(): boolean;
  /** Hands a completed run to the provider. */
  submit(run: PayrollRun): Promise<PayrollSubmitResult>;
}
