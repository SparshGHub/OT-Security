"use client";

import TimelineEventRow from "@/components/timeline/TimelineEventRow";
import { getCriticalityLevel } from "@/components/timeline/criticality";
import QuickResponseModal from "@/components/timeline/QuickResponseModal";
import { useAppState } from "@/lib/context/AppStateContext";
import { SimulationEvent } from "@/lib/types";
import React from "react";

type ShowLastOption = "none" | "1" | "5" | "10" | "100" | "all";
const SHOW_LAST_OPTIONS: ShowLastOption[] = ["none", "1", "5", "10", "100", "all"];

export default function TimelinePage() {
  const [events, setEvents] = React.useState<SimulationEvent[]>([]);
  const [loading, setLoading] = React.useState(false);
  const [showLast, setShowLast] = React.useState<ShowLastOption>("all");

  // Quick-response modal state
  const [modalEvent, setModalEvent] = React.useState<SimulationEvent | null>(null);
  const [modalAttackSource, setModalAttackSource] = React.useState("");
  const [modalComponentName, setModalComponentName] = React.useState<string | undefined>();
  const [modalComponentType, setModalComponentType] = React.useState<string | undefined>();
  const [modalProcessName, setModalProcessName] = React.useState<string | undefined>();

  const { token, topology, loadInitialData, mitigatedEventIds } = useAppState();

  const apiBase =
    (typeof globalThis !== "undefined" &&
      (globalThis as any).process?.env?.NEXT_PUBLIC_API_URL) ||
    "http://localhost:4000/api";

  // Ensure topology data is loaded in this isolated tab
  React.useEffect(() => {
    if (token && !topology) {
      loadInitialData().catch(console.error);
    }
  }, [token, topology, loadInitialData]);

  // Back-navigation guard for new-tab behaviour
  React.useEffect(() => {
    window.history.pushState({ timelineTab: true }, "", window.location.href);
    const handlePopState = () => {
      if (window.opener && !window.opener.closed) {
        window.close();
        if (!window.closed) window.location.href = "/";
        return;
      }
      window.location.href = "/";
    };
    window.addEventListener("popstate", handlePopState);
    return () => window.removeEventListener("popstate", handlePopState);
  }, []);

  // Fetch & poll events
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
        if (!res.ok) { setEvents([]); return; }
        const data = (await res.json()) as SimulationEvent[];
        setEvents(
          [...data].sort((a, b) => {
            const ta = a.timestamp ? new Date(a.timestamp).getTime() : 0;
            const tb = b.timestamp ? new Date(b.timestamp).getTime() : 0;
            return tb - ta;
          })
        );
      } catch {
        setEvents([]);
      } finally {
        setLoading(false);
      }
    };
    fetchEvents();
    const id = setInterval(fetchEvents, 5000);
    return () => clearInterval(id);
  }, [token, apiBase]);

  // Lookups
  const findComponent = (componentId?: string) =>
    componentId && topology?.components
      ? topology.components.find((c: any) => c.id === componentId)
      : undefined;

  const findProcessByComponent = (componentId?: string) => {
    const c = findComponent(componentId);
    return c && topology?.processes
      ? topology.processes.find((p: any) => p.id === c.process_id)
      : undefined;
  };

  // Rule-violation count per attack_id (for criticality scoring)
  const ruleViolationCountByAttack = React.useMemo(() => {
    const counts = new Map<string, number>();
    events.forEach((ev) => {
      if (!ev.attack_id || !ev.rule_id) return;
      counts.set(ev.attack_id, (counts.get(ev.attack_id) ?? 0) + 1);
    });
    return counts;
  }, [events]);

  // Filtered slice
  const filteredEvents = React.useMemo(() => {
    if (showLast === "none") return [];
    if (showLast === "all") return events;
    const n = Number.parseInt(showLast, 10);
    return Number.isNaN(n) || n <= 0 ? events : events.slice(0, n);
  }, [events, showLast]);

  // Open the quick-response modal
  const handleSeeDetails = (event: SimulationEvent) => {
    const component = findComponent(event.component_id);
    const process = findProcessByComponent(event.component_id);
    const attackSource =
      (event.payload && (event.payload as any).source) ||
      event.attack_id ||
      "Unknown";
    setModalEvent(event);
    setModalAttackSource(String(attackSource));
    setModalComponentName(component?.name);
    setModalComponentType(component?.type);
    setModalProcessName(process?.name);
  };

  return (
    <div className="p-8 min-h-screen bg-gray-950 text-white">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-3xl font-bold">Full Event Timeline</h1>
      </div>

      {/* Controls */}
      <div className="mb-4 flex items-center gap-4">
        <div className="text-sm text-gray-300">Show last:</div>
        <select
          value={showLast}
          onChange={(e) => setShowLast(e.target.value as ShowLastOption)}
          className="bg-gray-800 border border-gray-700 text-white px-2 py-1 rounded"
        >
          {SHOW_LAST_OPTIONS.map((opt) => (
            <option key={opt} value={opt}>
              {opt === "none" ? "None" : opt === "all" ? "All" : opt}
            </option>
          ))}
        </select>
        <div className="ml-auto text-sm text-gray-400">
          Total Events: {events.length} | Displaying: {filteredEvents.length}
        </div>
      </div>

      {/* Table */}
      <div className="overflow-x-auto rounded-lg border border-gray-700">
        <table className="w-full text-left text-sm">
          <thead className="bg-gray-800 border-b border-gray-700 text-gray-300">
            <tr>
              {/* No "Select" column on this page */}
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
            {loading ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-gray-400">
                  Loading...
                </td>
              </tr>
            ) : filteredEvents.length === 0 ? (
              <tr>
                <td colSpan={7} className="p-6 text-center text-gray-400">
                  {showLast === "none" ? 'Filter set to "None"' : "No events recorded."}
                </td>
              </tr>
            ) : (
              filteredEvents.map((event, index) => {
                const component = findComponent(event.component_id);
                const process = findProcessByComponent(event.component_id);
                const attackSource =
                  (event.payload && (event.payload as any).source) ||
                  event.attack_id ||
                  "Unknown";
                const rulesViolated = event.attack_id
                  ? ruleViolationCountByAttack.get(event.attack_id) ?? 0
                  : event.rule_id
                  ? 1
                  : 0;
                const isBlockedAttack = event.type === "ATTACK_BLOCKED";
                const isMitigated = event.is_mitigated === true || mitigatedEventIds.has(event.id);
                const criticality = getCriticalityLevel(
                  event.severity,
                  rulesViolated,
                  isBlockedAttack,
                  event.type
                );

                return (
                  <TimelineEventRow
                    key={event.id}
                    event={event}
                    attackSource={String(attackSource)}
                    processName={process?.name}
                    componentName={component?.name}
                    criticality={criticality}
                    isMitigated={isMitigated}
                    hideRadio
                    onSeeDetails={handleSeeDetails}
                    rowClassName={
                      index % 2 === 0
                        ? "border-b border-gray-800 bg-gray-950 hover:bg-gray-800/40 transition"
                        : "border-b border-gray-800 bg-gray-900 hover:bg-gray-800/40 transition"
                    }
                  />
                );
              })
            )}
          </tbody>
        </table>
      </div>

      {/* Quick-response modal */}
      <QuickResponseModal
        event={modalEvent}
        attackSource={modalAttackSource}
        componentName={modalComponentName}
        componentType={modalComponentType}
        processName={modalProcessName}
        onClose={() => setModalEvent(null)}
      />
    </div>
  );
}
