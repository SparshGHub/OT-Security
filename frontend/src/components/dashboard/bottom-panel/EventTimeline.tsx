"use client";

import TimelineEventRow from "@/components/timeline/TimelineEventRow";
import { getCriticalityLevel } from "@/components/timeline/criticality";
import { ScrollArea } from "@/components/ui/scroll-area";
import { useAppState } from "@/lib/context/AppStateContext";
import { SimulationEvent } from "@/lib/types";
import React from "react";
import MitigationPlaybookModal from "./MitigationPlaybookModal";

// ---------------------------------------------------------------------------
// Helper: enrich an event with derived display data
// ---------------------------------------------------------------------------
type EnrichedEvent = {
  event: SimulationEvent;
  attackSource: string;
  processName?: string;
  componentName?: string;
  criticality: ReturnType<typeof getCriticalityLevel>;
  isMitigated: boolean;
};

const EventTimeline: React.FC = () => {
  const {
    token,
    topology,
    openMitigationModal,
    getMitigationById,
    mitigatedEventIds,
    mitigateEvent,
    mitigateAllEvents,
    setEvents: setGlobalEvents,
  } = useAppState();

  const [localEvents, setLocalEventsRaw] = React.useState<SimulationEvent[] | null>(null);
  const [loading, setLoading] = React.useState(false);
  const [selectedEventId, setSelectedEventId] = React.useState<string | null>(null);
  const [mitigationMessage, setMitigationMessage] = React.useState<string | null>(null);
  const [groupByComponent, setGroupByComponent] = React.useState(false);

  const apiBase =
    (typeof globalThis !== "undefined" &&
      (globalThis as any).process?.env?.NEXT_PUBLIC_API_URL) ||
    "http://localhost:4000/api";

  // Sync local events to global state so ProcessFlow can react
  const setEvents = React.useCallback(
    (next: SimulationEvent[]) => {
      setLocalEventsRaw(next);
      setGlobalEvents(next);
    },
    [setGlobalEvents]
  );

  React.useEffect(() => {
    const fetchEvents = async () => {
      if (!token) { setEvents([]); return; }
      setLoading(true);
      try {
        const res = await fetch(`${apiBase}/events`, {
          headers: {
            "Content-Type": "application/json",
            Authorization: `Bearer ${token}`,
          },
        });
        if (!res.ok) { setEvents([]); setLoading(false); return; }
        const data: SimulationEvent[] = await res.json();
        setEvents(data);
      } catch {
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };

    fetchEvents();
    const id = setInterval(fetchEvents, 5000);
    return () => clearInterval(id);
  }, [token]);

  // ---------------------------------------------------------------------------
  // Lookup helpers
  // ---------------------------------------------------------------------------
  const findComponent = (componentId?: string) =>
    componentId && topology?.components
      ? topology.components.find((c) => c.id === componentId)
      : undefined;

  const findProcessById = (processId?: string) =>
    processId && topology?.processes
      ? topology.processes.find((p) => p.id === processId)
      : undefined;

  // ---------------------------------------------------------------------------
  // Rule-violation count per attack_id
  // ---------------------------------------------------------------------------
  const ruleViolationCountByAttack = React.useMemo(() => {
    const counts = new Map<string, number>();
    (localEvents ?? []).forEach((ev) => {
      if (!ev.attack_id || !ev.rule_id) return;
      counts.set(ev.attack_id, (counts.get(ev.attack_id) ?? 0) + 1);
    });
    return counts;
  }, [localEvents]);

  // ---------------------------------------------------------------------------
  // Enrich events with display data
  // ---------------------------------------------------------------------------
  const enriched: EnrichedEvent[] = React.useMemo(() => {
    return (localEvents ?? []).map((ev) => {
      const component = findComponent(ev.component_id);
      const process = findProcessById(component?.process_id);
      const attackSource =
        (ev.payload && (ev.payload as any).source) || ev.attack_id || "Unknown";
      const rulesViolated = ev.attack_id
        ? ruleViolationCountByAttack.get(ev.attack_id) ?? 0
        : ev.rule_id ? 1 : 0;
      const isBlockedAttack = ev.type === "ATTACK_BLOCKED";
      const criticality = getCriticalityLevel(
        ev.severity,
        rulesViolated,
        isBlockedAttack,
        ev.type
      );
      return {
        event: ev,
        attackSource: String(attackSource),
        processName: process?.name,
        componentName: component?.name,
        criticality,
        isMitigated: ev.is_mitigated === true || mitigatedEventIds.has(ev.id),
      };
    });
  }, [localEvents, ruleViolationCountByAttack, mitigatedEventIds, topology]);

  // ---------------------------------------------------------------------------
  // Sort / group
  // ---------------------------------------------------------------------------
  const displayRows: EnrichedEvent[] = React.useMemo(() => {
    if (!groupByComponent) {
      // Default: newest-first timestamp sort
      return [...enriched].sort(
        (a, b) =>
          new Date(b.event.timestamp).getTime() -
          new Date(a.event.timestamp).getTime()
      );
    }
    // Group by component_id, within each group sort newest-first
    const groups = new Map<string, EnrichedEvent[]>();
    for (const row of enriched) {
      const key = row.event.component_id ?? "__unknown__";
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(row);
    }
    // Sort groups by the most-recent event in each group (desc)
    const sortedGroups = [...groups.entries()].sort(
      ([, a], [, b]) =>
        new Date(b[0].event.timestamp).getTime() -
        new Date(a[0].event.timestamp).getTime()
    );
    const result: EnrichedEvent[] = [];
    for (const [, rows] of sortedGroups) {
      rows.sort(
        (a, b) =>
          new Date(b.event.timestamp).getTime() -
          new Date(a.event.timestamp).getTime()
      );
      result.push(...rows);
    }
    return result;
  }, [enriched, groupByComponent]);

  // ---------------------------------------------------------------------------
  // Mitigate action
  // ---------------------------------------------------------------------------
  const handleViewMitigation = (event: SimulationEvent) => {
    if (!event.rule_id) return;
    const mitigation = getMitigationById(event.rule_id);
    if (mitigation) openMitigationModal(mitigation.id);
  };

  const handleMitigate = () => {
    if (!selectedEventId || !localEvents) return;
    const enrichedRow = enriched.find((r) => r.event.id === selectedEventId);
    if (!enrichedRow) return;

    mitigateEvent(selectedEventId);

    const { event, componentName, attackSource } = enrichedRow;
    setMitigationMessage(
      `✅ Attack "${attackSource}" on component "${componentName ?? event.component_id}" ` +
        `has been mitigated. The component is no longer under active threat.`
    );
    setSelectedEventId(null);
    setTimeout(() => setMitigationMessage(null), 6000);
  };

  const handleMitigateAll = () => {
    mitigateAllEvents();
    setSelectedEventId(null);
    setMitigationMessage(`✅ All active attacks have been completely mitigated across the system.`);
    setTimeout(() => setMitigationMessage(null), 6000);
  };

  const canMitigate =
    !!selectedEventId &&
    !mitigatedEventIds.has(selectedEventId ?? "") &&
    // Can't "mitigate" an already-blocked / invalid attack
    enriched.find((r) => r.event.id === selectedEventId)?.criticality !== "invalid";

  const hasActiveAttacks = enriched.some(
    (row) => row.criticality !== "invalid" && !row.isMitigated
  );

  // Group separators for grouped view
  const getGroupSeparator = (
    row: EnrichedEvent,
    idx: number,
    rows: EnrichedEvent[]
  ): boolean => {
    if (!groupByComponent) return false;
    if (idx === 0) return true;
    return rows[idx - 1].event.component_id !== row.event.component_id;
  };

  return (
    <div className="bg-card h-full flex flex-col">
      {/* Header */}
      <div className="p-2 px-4 border-b border-border flex items-center justify-between">
        <h3 className="font-semibold">Event Timeline</h3>
        <button
          onClick={() => setGroupByComponent((v) => !v)}
          className={`text-xs px-3 py-1 rounded-md border transition-colors ${
            groupByComponent
              ? "bg-indigo-700 border-indigo-500 text-white"
              : "border-border text-muted-foreground hover:text-foreground hover:border-indigo-500"
          }`}
          title={groupByComponent ? "Switch to timestamp view" : "Group by component"}
        >
          {groupByComponent ? "⊞ Grouped by Component" : "⊟ Sort by Time"}
        </button>
      </div>

      <ScrollArea className="flex-1 p-2">
        <div className="p-2">
          {loading && (
            <div className="text-sm text-muted-foreground">Loading events...</div>
          )}

          {!loading && (!localEvents || localEvents.length === 0) && (
            <div className="text-sm text-muted-foreground">
              No events recorded. Run a simulation to begin.
            </div>
          )}

          {/* Mitigation confirmation message */}
          {mitigationMessage && (
            <div className="mb-3 flex items-start gap-2 rounded-md border border-green-600 bg-green-950/60 px-4 py-3 text-sm text-green-300">
              <span className="flex-1">{mitigationMessage}</span>
              <button
                onClick={() => setMitigationMessage(null)}
                className="ml-2 text-green-400 hover:text-green-200 font-bold text-base leading-none"
                aria-label="Dismiss"
              >
                ×
              </button>
            </div>
          )}

          {/* Action buttons row */}
          <div className="mt-4 flex justify-center gap-3 flex-wrap">
            <a
              href="/timeline"
              target="_blank"
              rel="noopener noreferrer"
              className="px-4 py-2 bg-blue-600 hover:bg-blue-700 rounded-md text-white text-sm"
            >
              Go To Full Timeline Page
            </a>
            <button
              onClick={handleMitigate}
              disabled={!canMitigate}
              className="px-4 py-2 rounded-md text-sm font-medium text-white
                         bg-red-600 hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed
                         transition-colors"
            >
              Mitigate Selected Attack
            </button>
            <button
              onClick={handleMitigateAll}
              disabled={!hasActiveAttacks || loading}
              className="px-4 py-2 rounded-md text-sm font-medium text-white
                         bg-orange-600 hover:bg-orange-700 disabled:opacity-40 disabled:cursor-not-allowed
                         transition-colors"
            >
              Mitigate All
            </button>
          </div>

          {!loading && displayRows.length > 0 && (
            <table className="w-full text-left text-sm mt-4">
              <thead>
                <tr className="text-xs text-muted-foreground">
                  <th className="py-2 px-3">Select</th>
                  <th className="py-2 px-3">Time</th>
                  <th className="py-2 px-3">Criticality</th>
                  <th className="py-2 px-3">Attack Source</th>
                  <th className="py-2 px-3">Destination</th>
                  <th className="py-2 px-3">Type</th>
                  <th className="py-2 px-3">Message</th>
                  <th className="py-2 px-3">Action</th>
                </tr>
              </thead>
              <tbody>
                {displayRows.map((row, idx) => {
                  const showSeparator = getGroupSeparator(row, idx, displayRows);
                  const { event, attackSource, processName, componentName, criticality, isMitigated } = row;
                  return (
                    <React.Fragment key={event.id}>
                      {/* Component group header in grouped mode */}
                      {showSeparator && groupByComponent && (
                        <tr>
                          <td
                            colSpan={8}
                            className="pt-4 pb-1 px-3 text-xs font-semibold text-indigo-400 uppercase tracking-wider"
                          >
                            Component: {componentName ?? event.component_id ?? "Unknown"}
                          </td>
                        </tr>
                      )}
                      <TimelineEventRow
                        event={event}
                        attackSource={attackSource}
                        processName={processName}
                        componentName={componentName}
                        criticality={criticality}
                        onViewPlaybook={handleViewMitigation}
                        rowClassName={`border-b border-border ${isMitigated ? "opacity-50" : ""}`}
                        isSelected={selectedEventId === event.id}
                        isMitigated={isMitigated}
                        onSelect={() =>
                          setSelectedEventId((prev) =>
                            prev === event.id ? null : event.id
                          )
                        }
                      />
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          )}
        </div>
      </ScrollArea>

      <MitigationPlaybookModal />
    </div>
  );
};

export default EventTimeline;
