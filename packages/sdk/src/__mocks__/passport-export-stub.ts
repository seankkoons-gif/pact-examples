/**
 * Stub for @pact/passport when the passport package is not present (e.g. SDK-only / pact-examples export).
 * Exports minimal implementations so boundary/credit and credit tests can run.
 */

export type CreditTier = "A" | "B" | "C";

export interface CreditTerms {
  tier: CreditTier;
  max_outstanding_exposure_usd: number;
  max_per_intent_usd: number;
  max_per_counterparty_usd: number;
  collateral_ratio: number;
  required_escrow: boolean;
  disabled_until?: number;
  reason?: string;
}

export interface CreditDecision {
  allowed: boolean;
  required_collateral_usd: number;
  reason_codes: string[];
}

export interface PassportStorage {
  getCreditExposure(agentId: string): { agent_id: string; outstanding_usd: number; per_counterparty_json: string; updated_at: number } | null;
  getRecentFailures(agentId: string, windowMs: number, failureCodePattern?: string): Array<{ transcript_hash: string }>;
}

function computeTier(score: number, confidence: number): CreditTier {
  if (score < 70 || confidence < 0.6) return "C";
  if (score >= 85 && confidence >= 0.8) return "A";
  if (score >= 70 && score < 85 && confidence >= 0.7) return "B";
  return "C";
}

function getTierTerms(tier: CreditTier): Omit<CreditTerms, "tier" | "disabled_until" | "reason"> {
  switch (tier) {
    case "A":
      return { max_outstanding_exposure_usd: 5000, max_per_intent_usd: 2000, max_per_counterparty_usd: 1000, collateral_ratio: 0.2, required_escrow: false };
    case "B":
      return { max_outstanding_exposure_usd: 1000, max_per_intent_usd: 500, max_per_counterparty_usd: 200, collateral_ratio: 0.5, required_escrow: true };
    default:
      return { max_outstanding_exposure_usd: 0, max_per_intent_usd: 0, max_per_counterparty_usd: 0, collateral_ratio: 1.0, required_escrow: true };
  }
}

export function computeCreditTerms(
  agentId: string,
  _storage: PassportStorage,
  passportScore: number,
  passportConfidence: number,
  _asOf: number = Date.now()
): CreditTerms {
  const tier = computeTier(passportScore, passportConfidence);
  const tierTerms = getTierTerms(tier);
  return { tier, ...tierTerms };
}

export function canExtendCredit(
  agentId: string,
  counterpartyId: string,
  amountUsd: number,
  storage: PassportStorage,
  passportScore: number,
  passportConfidence: number,
  _asOf: number = Date.now()
): CreditDecision {
  const terms = computeCreditTerms(agentId, storage, passportScore, passportConfidence, _asOf);
  if (terms.tier === "C") {
    return { allowed: false, required_collateral_usd: amountUsd, reason_codes: ["TIER_TOO_LOW"] };
  }
  const exposure = storage.getCreditExposure(agentId);
  const outstandingUsd = exposure?.outstanding_usd || 0;
  let perCounterparty: Record<string, number> = {};
  try {
    perCounterparty = JSON.parse(exposure?.per_counterparty_json || "{}");
  } catch {
    /* ignore */
  }
  const requiredCollateralUsd = amountUsd * terms.collateral_ratio;
  const creditExposureUsd = amountUsd - requiredCollateralUsd;
  const newOutstandingUsd = outstandingUsd + creditExposureUsd;
  const newPerCounterpartyUsd = (perCounterparty[counterpartyId] || 0) + creditExposureUsd;
  const reasonCodes: string[] = [];
  if (newOutstandingUsd > terms.max_outstanding_exposure_usd) reasonCodes.push("OUTSTANDING_EXPOSURE_EXCEEDED");
  if (creditExposureUsd > terms.max_per_intent_usd) reasonCodes.push("PER_INTENT_EXPOSURE_EXCEEDED");
  if (newPerCounterpartyUsd > terms.max_per_counterparty_usd) reasonCodes.push("PER_COUNTERPARTY_EXPOSURE_EXCEEDED");
  if (reasonCodes.length > 0) {
    return { allowed: false, required_collateral_usd: amountUsd, reason_codes: reasonCodes };
  }
  return { allowed: true, required_collateral_usd: requiredCollateralUsd, reason_codes: [] };
}

export function mapCreditDenialToFailureEvent(
  creditDecision: CreditDecision,
  agentId: string,
  transcriptHash: string,
  timestamp: number
): { code: string; stage: string; fault_domain: string; terminality: string; evidence_refs: string[]; timestamp: number; transcript_hash: string } | null {
  if (creditDecision.allowed) return null;
  let failureCode = "PACT-101";
  let faultDomain = "policy";
  let stage = "commitment";
  if (creditDecision.reason_codes.includes("PACT-1xx_VIOLATION")) {
    stage = "admission";
  } else if (creditDecision.reason_codes.includes("IDENTITY_FAILURE")) {
    failureCode = "PACT-201";
    faultDomain = "identity";
    stage = "admission";
  } else if (
    creditDecision.reason_codes.some((c) =>
      ["OUTSTANDING_EXPOSURE_EXCEEDED", "PER_INTENT_EXPOSURE_EXCEEDED", "PER_COUNTERPARTY_EXPOSURE_EXCEEDED"].includes(c)
    )
  ) {
    stage = "commitment";
  }
  return {
    code: failureCode,
    stage,
    fault_domain: faultDomain,
    terminality: "terminal",
    evidence_refs: [`credit_decision:${agentId}:${transcriptHash}`, ...creditDecision.reason_codes.map((c) => `credit_denial:${c}`)],
    timestamp,
    transcript_hash: transcriptHash,
  };
}

export class MemoryPassportStorage implements PassportStorage {
  private creditExposure: Map<string, { agent_id: string; outstanding_usd: number; per_counterparty_json: string; updated_at: number }> = new Map();

  constructor(_dbPath: string) {
    /* no-op */
  }

  getCreditExposure(agentId: string): { agent_id: string; outstanding_usd: number; per_counterparty_json: string; updated_at: number } | null {
    return this.creditExposure.get(agentId) ?? null;
  }

  getRecentFailures(_agentId: string, _windowMs: number, _failureCodePattern?: string): Array<{ transcript_hash: string }> {
    return [];
  }
}
