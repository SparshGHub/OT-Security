import { SimulationEvent } from "@/lib/types";

export type CriticalityLevel = "invalid" | "low" | "medium" | "high" | "critical";

/**
 * Weighted criticality scoring.
 *
 * For ATTACK_BLOCKED events the attack was not viable according to our rules —
 * we label these "invalid" so they stand apart from real threats and are never
 * shown as something the operator needs to mitigate.
 *
 * For all other events we use a weighted score across three axes:
 *   • Severity weight  (info=1, alert=3, critical=5)
 *   • Rules-violated weight (logarithmic pressure: 0→0, 1→1, 2→2, 3→3, 4+→4)
 *   • Type bonus: ATTACK events get +1 over plain INFO events
 *
 * Score bands:
 *   ≥ 8  → critical
 *   ≥ 5  → high
 *   ≥ 3  → medium
 *   ≥ 1  → low
 */
export const getCriticalityLevel = (
  severity: SimulationEvent["severity"],
  rulesViolated: number,
  isBlocked?: boolean,
  eventType?: string
): CriticalityLevel => {
  // Blocked attacks are not viable — mark as INVALID, no further scoring needed.
  if (isBlocked) return "invalid";

  const severityWeight =
    severity === "critical" ? 5 : severity === "alert" ? 3 : 1;

  // Capped logarithmic-style step: each additional rule violation adds pressure
  const rulesWeight = Math.min(rulesViolated, 4);

  // Small bonus for pure ATTACK-type events (not just rule-fire notifications)
  const typeBonus =
    eventType && (eventType === "ATTACK" || eventType === "ATTACK_DETECTED")
      ? 1
      : 0;

  const totalScore = severityWeight + rulesWeight + typeBonus;

  if (totalScore >= 8) return "critical";
  if (totalScore >= 5) return "high";
  if (totalScore >= 3) return "medium";
  return "low";
};

export const getCriticalityClass = (criticality: CriticalityLevel): string => {
  switch (criticality) {
    case "critical":
      return "bg-red-500/20 text-red-300 border-red-500/50";
    case "high":
      return "bg-orange-500/20 text-orange-300 border-orange-500/50";
    case "medium":
      return "bg-yellow-500/20 text-yellow-300 border-yellow-500/50";
    case "low":
      return "bg-emerald-500/20 text-emerald-300 border-emerald-500/50";
    case "invalid":
      // Purple-slate — visually distinct from all threat levels
      return "bg-purple-500/20 text-purple-300 border-purple-500/50";
    default:
      return "bg-slate-500/20 text-slate-300 border-slate-500/50";
  }
};
