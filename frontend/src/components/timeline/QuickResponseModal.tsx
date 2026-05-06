"use client";

import React from "react";
import { SimulationEvent } from "@/lib/types";

// ---------------------------------------------------------------------------
// Role colour mapping
// ---------------------------------------------------------------------------
const ROLE_COLORS: Record<string, string> = {
  "Plant Manager":           "bg-blue-800/60 border-blue-500 text-blue-200",
  "OT Security Analyst":     "bg-red-800/60 border-red-500 text-red-200",
  "Control System Engineer": "bg-orange-800/60 border-orange-500 text-orange-200",
  "Network Administrator":   "bg-cyan-800/60 border-cyan-500 text-cyan-200",
  "Safety Officer":          "bg-yellow-800/60 border-yellow-500 text-yellow-200",
};

const PLACEHOLDER_STEPS: Array<{ role: string; action: string }> = [
  {
    role: "OT Security Analyst",
    action:
      "Isolate the affected network segment and capture packet traces for threat analysis. " +
      "Document all anomalous traffic patterns observed on the impacted component.",
  },
  {
    role: "Control System Engineer",
    action:
      "Switch the targeted component into manual override mode. " +
      "Verify all active setpoints are within safe operating bounds and immediately disable any active remote-access sessions.",
  },
  {
    role: "Network Administrator",
    action:
      "Block the attacker's source address at the perimeter firewall and applicable VLAN boundary. " +
      "Apply ACL rules to restrict lateral movement within the OT network.",
  },
  {
    role: "Safety Officer",
    action:
      "Assess physical and process-safety impact of the compromised component. " +
      "Issue a safety stand-down for nearby personnel if sensor or actuator integrity cannot be confirmed.",
  },
  {
    role: "Plant Manager",
    action:
      "Notify the incident response team and applicable regulatory or compliance bodies. " +
      "Draft a preliminary incident summary for stakeholder briefing and initiate the post-incident review process.",
  },
];

// ---------------------------------------------------------------------------
// Human-readable attack type labels
// ---------------------------------------------------------------------------
const ATTACK_TYPE_LABELS: Record<string, string> = {
  ATTACK:               "Active Attack",
  ATTACK_DETECTED:      "Attack Detected",
  ATTACK_BLOCKED:       "Attack Blocked (Invalid)",
  RULE_VIOLATION:       "Rule Violation",
  ANOMALY:              "Anomaly Detected",
  INFO:                 "Informational Event",
};

function formatAttackType(type: string): string {
  return ATTACK_TYPE_LABELS[type] ?? type.replace(/_/g, " ");
}

// ---------------------------------------------------------------------------
// Props
// ---------------------------------------------------------------------------
interface QuickResponseModalProps {
  event: SimulationEvent | null;
  attackSource: string;
  componentName?: string;
  componentType?: string;   // e.g. "PLC", "HMI", "Sensor"
  processName?: string;     // which section of the plant
  onClose: () => void;
}

// ---------------------------------------------------------------------------
// Info pill helper
// ---------------------------------------------------------------------------
function Pill({
  label,
  value,
  color = "text-gray-200",
}: {
  label: string;
  value: string;
  color?: string;
}) {
  return (
    <div className="flex flex-col gap-0.5">
      <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
        {label}
      </span>
      <span className={`text-sm font-medium ${color}`}>{value}</span>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------
export default function QuickResponseModal({
  event,
  attackSource,
  componentName,
  componentType,
  processName,
  onClose,
}: QuickResponseModalProps) {
  if (!event) return null;

  const handleBackdropClick = (e: React.MouseEvent<HTMLDivElement>) => {
    if (e.target === e.currentTarget) onClose();
  };

  const attackTypeLabel = formatAttackType(event.type);
  const severity = event.severity?.toUpperCase() ?? "UNKNOWN";
  const severityColor =
    severity === "CRITICAL"
      ? "text-red-300"
      : severity === "ALERT"
      ? "text-orange-300"
      : "text-emerald-300";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm"
      onClick={handleBackdropClick}
    >
      <div className="relative w-full max-w-2xl max-h-[90vh] overflow-y-auto rounded-xl border border-gray-700 bg-gray-950 shadow-2xl p-6">
        {/* Close */}
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-gray-400 hover:text-white text-xl font-bold leading-none"
          aria-label="Close"
        >
          ×
        </button>

        {/* ── Header ── */}
        <div className="mb-2">
          <span className="text-xs font-semibold uppercase tracking-widest text-red-400">
            Quick Response Guide
          </span>
        </div>

        <h2 className="text-xl font-bold text-white mb-1">
          {componentType || "Component"}:{" "}
          <span className="text-red-300">{componentName || "Unknown"}</span>
        </h2>
        <p className="text-sm text-gray-300 mb-4 font-medium">
          Region of Attack:{" "}
          <span className="text-indigo-300 font-bold">
            {processName || "Unknown Region"}
          </span>
        </p>

        {/* ── Context grid ── */}
        <div className="grid grid-cols-2 sm:grid-cols-3 gap-4 rounded-lg border border-gray-800 bg-gray-900/60 p-4 mb-5">
          <Pill
            label="Attack Type"
            value={attackTypeLabel}
            color="text-red-200"
          />
          <Pill
            label="Severity"
            value={severity}
            color={severityColor}
          />
          {processName && (
            <Pill
              label="Plant Section"
              value={processName}
              color="text-indigo-200"
            />
          )}
          {componentName && (
            <Pill
              label="Target Component"
              value={componentName}
              color="text-amber-200"
            />
          )}
          {componentType && (
            <Pill
              label="Component Type"
              value={componentType}
              color="text-cyan-200"
            />
          )}
          {event.payload && (event.payload as any).message && (
            <div className="col-span-2 sm:col-span-3 flex flex-col gap-0.5">
              <span className="text-[10px] font-semibold uppercase tracking-widest text-gray-500">
                Event Message
              </span>
              <span className="text-sm text-gray-300 italic">
                "{(event.payload as any).message}"
              </span>
            </div>
          )}
        </div>

        <hr className="border-gray-800 mb-5" />

        {/* ── Response Steps ── */}
        <p className="text-xs text-gray-500 uppercase tracking-widest mb-3 font-semibold">
          Recommended Response Steps
        </p>
        <div className="space-y-4">
          {PLACEHOLDER_STEPS.map((step, i) => {
            const badgeClass =
              ROLE_COLORS[step.role] ?? "bg-gray-800/60 border-gray-600 text-gray-300";
            return (
              <div
                key={i}
                className="rounded-lg border border-gray-800 bg-gray-900/60 p-4"
              >
                <div className="flex items-start gap-3">
                  <div className="flex-shrink-0 w-7 h-7 rounded-full bg-gray-800 border border-gray-600 flex items-center justify-center text-xs font-bold text-gray-300">
                    {i + 1}
                  </div>
                  <div className="flex-1 min-w-0">
                    <span
                      className={`inline-block rounded-md border px-2 py-0.5 text-xs font-semibold mb-2 ${badgeClass}`}
                    >
                      {step.role}
                    </span>
                    <p className="text-sm text-gray-300 leading-relaxed">
                      {step.action}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* ── Footer ── */}
        <div className="mt-6 flex justify-end gap-3">
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm rounded-md border border-gray-700 text-gray-300 hover:bg-gray-800"
          >
            Close
          </button>
          <a
            href={`/mitigation/${event.id}`}
            target="_blank"
            rel="noopener noreferrer"
            className="px-4 py-2 text-sm rounded-md bg-cyan-600 hover:bg-cyan-500 text-white font-medium transition-colors"
          >
            Open Full Mitigation Page →
          </a>
        </div>
      </div>
    </div>
  );
}
