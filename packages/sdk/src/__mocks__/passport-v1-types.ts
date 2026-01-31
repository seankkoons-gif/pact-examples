/**
 * Stub export for @pact/passport/src/v1/types when passport package is not present (e.g. SDK-only export).
 */

export type PassportState = {
  version: "passport/1.0";
  agent_id: string;
  score: number;
  counters: {
    total_settlements: number;
    successful_settlements: number;
    disputes_lost: number;
    disputes_won: number;
    sla_violations: number;
    policy_aborts: number;
  };
};
