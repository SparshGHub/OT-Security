import { Badge } from "@/components/ui/badge";
import { SimulationEvent } from "@/lib/types";
import { CriticalityLevel, getCriticalityClass } from "./criticality";

interface TimelineEventRowProps {
  event: SimulationEvent;
  attackSource: string;
  processName?: string;
  componentName?: string;
  criticality: CriticalityLevel;
  onViewPlaybook?: (event: SimulationEvent) => void;
  rowClassName?: string;
  /** Whether the radio button for this row is selected */
  isSelected?: boolean;
  /** Whether this event has already been mitigated */
  isMitigated?: boolean;
  /** Callback when the radio button is clicked */
  onSelect?: () => void;
  /** When true (full timeline page) the radio-button Select column is hidden */
  hideRadio?: boolean;
  /** When provided, "See Details" fires this callback instead of navigating */
  onSeeDetails?: (event: SimulationEvent) => void;
}

const formatTime = (iso?: string) => {
  if (!iso) return "-";
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return iso;
  return new Intl.DateTimeFormat("en-US", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
  }).format(d);
};

export default function TimelineEventRow({
  event,
  attackSource,
  processName,
  componentName,
  criticality,
  onViewPlaybook,
  rowClassName,
  isSelected = false,
  isMitigated = false,
  onSelect,
  hideRadio = false,
  onSeeDetails,
}: TimelineEventRowProps) {
  return (
    <tr className={rowClassName}>
      {/* Radio-button column — hidden on full timeline page */}
      {!hideRadio && (
        <td className="py-2 px-3 align-middle text-center">
          <input
            type="radio"
            name="selected-attack-event"
            checked={isSelected}
            disabled={isMitigated || criticality === "invalid"}
            onChange={() => onSelect?.()}
            className="h-4 w-4 accent-red-500 cursor-pointer disabled:cursor-not-allowed disabled:opacity-40"
            title={
              criticality === "invalid"
                ? "Attack blocked by rules — no mitigation needed"
                : isMitigated
                ? "Already mitigated"
                : "Select to mitigate"
            }
            aria-label={`Select event ${event.id} for mitigation`}
          />
        </td>
      )}

      <td className="py-2 px-3 align-top">
        <div className="text-xs">{formatTime(event.timestamp)}</div>
      </td>

      <td className="py-2 px-3 align-top">
        <Badge className={getCriticalityClass(criticality)}>{criticality}</Badge>
      </td>

      <td className="py-2 px-3 align-top">
        <div
          className={`text-sm ${
            criticality === "invalid"
              ? "line-through text-muted-foreground"
              : isMitigated
              ? "line-through text-muted-foreground"
              : ""
          }`}
        >
          {attackSource}
        </div>
      </td>

      <td className="py-2 px-3 align-top">
        <div className="text-sm">
          <div className="font-medium">{processName ?? "Unknown Process"}</div>
          <div className="text-xs text-muted-foreground">
            {componentName ?? event.component_id}
          </div>
        </div>
      </td>

      <td className="py-2 px-3 align-top">
        <div className="text-sm">{event.type}</div>
      </td>

      <td className="py-2 px-3 align-top">
        <div className="text-sm">
          {(event.payload && (event.payload as any).message) || "-"}
        </div>
      </td>

      <td className="py-2 px-3 align-top">
        <div className="flex flex-wrap items-center gap-2">
          {event.rule_id && onViewPlaybook ? (
            <button
              onClick={() => onViewPlaybook(event)}
              className="text-sm underline"
            >
              View Playbook
            </button>
          ) : null}

          {onSeeDetails ? (
            <button
              onClick={() => onSeeDetails(event)}
              className="rounded-md bg-cyan-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-cyan-500"
            >
              See Details
            </button>
          ) : (
            <a
              href={`/mitigation/${event.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="rounded-md bg-cyan-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-cyan-500"
            >
              See Details
            </a>
          )}

          {isMitigated && (
            <span className="rounded-md bg-green-800/60 border border-green-600 px-2.5 py-1 text-xs font-medium text-green-300">
              Mitigated ✓
            </span>
          )}

          {criticality === "invalid" && !isMitigated && (
            <span
              className="rounded-md bg-purple-800/60 border border-purple-500 px-2.5 py-1 text-xs font-medium text-purple-300"
              title="Attack was blocked by active rules — not a viable threat"
            >
              Invalid ✗
            </span>
          )}
        </div>
      </td>
    </tr>
  );
}
