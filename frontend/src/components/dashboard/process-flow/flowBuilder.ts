import { Edge, Node } from 'reactflow';
import { PlantTopology, SimulationEvent } from '@/lib/types';

const NODE_WIDTH = 180;
const NODE_HEIGHT = 80;
const HORIZONTAL_SPACING = 250;
const VERTICAL_SPACING = 150;

// helpers to safely read either API shape
function getFromId(conn: any): string {
  return conn.from_component_id ?? conn.from_component;
}
function getToId(conn: any): string {
  return conn.to_component_id ?? conn.to_component;
}

export const buildFlowElements = (
  topology: PlantTopology,
  processId: string,
  selectedComponentId: string | null,
  events: SimulationEvent[]
) => {
  const nodes: Node[] = [];
  const edges: Edge[] = [];

  const processComponents = topology.components.filter((c) => c.process_id === processId);

  // Group components by type for a simple grid layout
  const componentTypes = [...new Set(processComponents.map((c) => c.type))];
  const columns: Record<string, typeof processComponents> = {};
  componentTypes.forEach((type) => {
    columns[type] = processComponents.filter((c) => c.type === type);
  });

  const affectedComponentIds = new Set(events.map((e) => e.component_id));

  let colIndex = 0;
  for (const type of Object.keys(columns)) {
    columns[type].forEach((component, rowIndex) => {
      const isSelected = component.id === selectedComponentId;
      const isAffected = affectedComponentIds.has(component.id);

      nodes.push({
        id: component.id,
        data: { label: component.name, type: component.type },
        position: { x: colIndex * HORIZONTAL_SPACING, y: rowIndex * VERTICAL_SPACING },
        style: {
          width: NODE_WIDTH,
          height: NODE_HEIGHT,
          border: isSelected ? '2px solid #60a5fa' : isAffected ? '2px solid #f87171' : undefined,
          boxShadow: isSelected ? '0 0 10px #60a5fa' : isAffected ? '0 0 10px #f87171' : undefined,
          display: 'flex',
          justifyContent: 'center',
          alignItems: 'center',
          textAlign: 'center',
        },
      });
    });
    colIndex++;
  }

  // keep only edges where both ends are inside this process
  const processConnectivity = topology.connectivity.filter((conn: any) => {
    const fromId = getFromId(conn);
    const toId = getToId(conn);
    const fromInProcess = processComponents.some((c) => c.id === fromId);
    const toInProcess = processComponents.some((c) => c.id === toId);
    return fromInProcess && toInProcess;
  });

  processConnectivity.forEach((conn: any, i: number) => {
    const source = getFromId(conn);
    const target = getToId(conn);

    edges.push({
      id: `e-${source}-${target}-${i}`,
      source,
      target,
      animated: !!events.find((e) => e.component_id === source || e.component_id === target),
      label: conn.protocol,
    });
  });

  return { nodes, edges };
};

