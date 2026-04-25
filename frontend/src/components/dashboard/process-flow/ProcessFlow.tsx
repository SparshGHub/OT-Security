'use client';

import React, { useMemo, useCallback, useEffect, useRef } from 'react';
import ReactFlow, {
  Background,
  Controls,
  Connection,
  Edge,
  ReactFlowProvider,
  Node,
  MarkerType,
  OnEdgesDelete,
  OnNodesChange,
  addEdge,
  useEdgesState,
  useNodesState,
  Viewport,
  NodeProps,
  OnMove,
  Handle,
  Position,
  useReactFlow,
} from 'reactflow';
import 'reactflow/dist/style.css';
import { useAppState } from '@/lib/context/AppStateContext';
import AddComponentDialog from './AddComponentDialog';

// ---------- localStorage helpers (per-process) ----------
const VP_KEY = (pid: string) => `rf:viewport:${pid}`;
const POS_KEY = (pid: string) => `rf:positions:${pid}`;
type PosMap = Record<string, { x: number; y: number }>;

function loadViewport(pid: string): Viewport | null {
  if (typeof window === 'undefined') return null;
  try {
    const raw = localStorage.getItem(VP_KEY(pid));
    return raw ? (JSON.parse(raw) as Viewport) : null;
  } catch {
    return null;
  }
}
function saveViewport(pid: string, vp: Viewport) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(VP_KEY(pid), JSON.stringify(vp));
}
function loadPositions(pid: string): PosMap {
  if (typeof window === 'undefined') return {};
  try {
    const raw = localStorage.getItem(POS_KEY(pid));
    return raw ? (JSON.parse(raw) as PosMap) : {};
  } catch {
    return {};
  }
}
function savePositions(pid: string, map: PosMap) {
  if (typeof window === 'undefined') return;
  localStorage.setItem(POS_KEY(pid), JSON.stringify(map));
}

// ---------- Custom Node ----------
type RFNodeData = {
  label: string;
  componentId: string;
  isAttacked: boolean;
};

function NodeRenderer({ data, selected, id }: NodeProps<RFNodeData>) {
  const { deleteElements } = useReactFlow();

  const handleDelete = (e: React.MouseEvent) => {
    e.stopPropagation();
    deleteElements({ nodes: [{ id }] });
  };

  return (
    <div
      className={`relative rounded-md border bg-white shadow p-2 flex items-center gap-2 ${
        selected ? 'ring-2 ring-blue-500 border-blue-500' : ''
      } ${
        data.isAttacked ? 'animate-glow-red border-red-500' : ''
      }`}
    >
      <Handle type="target" position={Position.Left} className="!w-2 !h-2 !bg-blue-500" />
      <span className="font-medium">{data.label}</span>
      <button
        className="ml-2 h-6 w-6 grid place-items-center rounded hover:bg-red-100 text-red-600"
        onClick={handleDelete}
        title="Remove component"
        aria-label="Remove component"
      >
        ×
      </button>
      <Handle type="source" position={Position.Right} className="!w-2 !h-2 !bg-blue-500" />
    </div>
  );
}
const nodeTypes = { default: NodeRenderer as any };

// ---------- Inner canvas ----------
function ProcessFlowInner() {
  const {
    topology,
    selectedProcessId,
    selectComponent,
    addConnectivity,
    removeConnectivity,
    removeComponent,
    events,
    mitigatedEventIds,
  } = useAppState();

  // Derive which component IDs are currently under (non-mitigated) attack
  const activeAttackedComponentIds = useMemo(() => {
    const ids = new Set<string>();
    events.forEach((ev) => {
      if (
        ev.component_id &&
        ev.type !== 'ATTACK_BLOCKED' &&
        !ev.is_mitigated &&
        !mitigatedEventIds.has(ev.id)
      ) {
        ids.add(ev.component_id);
      }
    });
    return ids;
  }, [events, mitigatedEventIds]);

  const processId = selectedProcessId ?? '';
  const posRef = useRef<PosMap>({});

  const { setViewport, fitView } = useReactFlow();

  const processComponents = useMemo(
    () => topology?.components.filter((c) => c.process_id === processId) ?? [],
    [topology, processId]
  );

  const [nodes, setNodes, onNodesChange] = useNodesState<RFNodeData>([]);
  const [edges, setEdges, onEdgesChange] = useEdgesState<Edge>([]);

  // Extended onNodesChange to save positions
  const onNodesChangeExtended = useCallback<OnNodesChange>(
    (changes) => {
      onNodesChange(changes);

      let changed = false;
      changes.forEach((ch) => {
        if (ch.type === 'position' && ch.position && ch.id) {
          posRef.current[ch.id] = { x: ch.position.x, y: ch.position.y };
          changed = true;
        }
      });
      if (changed && processId) {
        savePositions(processId, posRef.current);
      }
    },
    [onNodesChange, processId]
  );

  // Rebuild nodes/edges when topology changes (add/delete component)
  useEffect(() => {
    if (!processId || !topology) {
      setNodes([]);
      setEdges([]);
      return;
    }

    // Load saved positions
    posRef.current = loadPositions(processId);

    const newNodes = processComponents.map((c, idx) => {
      const savedPos = posRef.current[c.id];
      const position = savedPos ?? {
        x: 100 + (idx % 4) * 220,
        y: 80 + Math.floor(idx / 4) * 140,
      };

      return {
        id: c.id,
        type: 'default',
        position,
        data: {
          label: `${c.name} (${c.type})`,
          componentId: c.id,
          isAttacked: activeAttackedComponentIds.has(c.id),
        } as RFNodeData,
        draggable: true,
        selectable: true,
        deletable: true,
      };
    });

    setNodes(newNodes);

    const currentIds = new Set(processComponents.map((c) => c.id));
    const newEdges = topology.connectivity
      .filter((e) => currentIds.has(e.from_component_id) && currentIds.has(e.to_component_id))
      .map((e) => ({
        id: e.id,
        source: e.from_component_id,
        target: e.to_component_id,
        label: `${e.protocol}`,
        markerEnd: { type: MarkerType.ArrowClosed },
        animated: e.direction === 'bi',
      }));

    setEdges(newEdges);

    const savedVp = loadViewport(processId);
    if (savedVp) {
      setViewport(savedVp);
    } else {
      requestAnimationFrame(() => fitView?.());
    }
  }, [processId, topology, setNodes, setEdges, setViewport, fitView]);

  // Reactively update isAttacked on nodes when attack state changes
  useEffect(() => {
    setNodes((nds) =>
      nds.map((n) => ({
        ...n,
        data: {
          ...n.data,
          isAttacked: activeAttackedComponentIds.has(n.id),
        },
      }))
    );
  }, [activeAttackedComponentIds, setNodes]);

  const onNodeClick = useCallback(
    (_: React.MouseEvent, node: Node) => {
      selectComponent(node.id);
    },
    [selectComponent]
  );

  const onConnect = useCallback(
    async (connection: Connection) => {
      if (!connection.source || !connection.target) return;

      const created = await addConnectivity({
        from_component_id: connection.source,
        to_component_id: connection.target,
        protocol: 'OPC-UA',
        direction: 'bi',
      } as any);

      setEdges((eds) =>
        addEdge(
          {
            id: created.id,
            source: created.from_component_id,
            target: created.to_component_id,
            animated: created.direction === 'bi',
            label: created.protocol,
            markerEnd: { type: MarkerType.ArrowClosed },
          },
          eds
        )
      );
    },
    [addConnectivity, setEdges]
  );

  const onEdgesDelete: OnEdgesDelete = useCallback(
    async (eds: Edge[]) => {
      for (const e of eds) {
        await removeConnectivity(e.id);
      }
    },
    [removeConnectivity]
  );

  const onMoveEnd = useCallback<OnMove>(
    (_event, vp) => {
      if (processId) saveViewport(processId, vp);
    },
    [processId]
  );

  return (
    <div className="h-full w-full flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <div className="text-lg font-semibold">Process Flow</div>
        {processId && <AddComponentDialog processId={processId} />}
      </div>

      <div className="flex-1 min-h-[500px] rounded-md border overflow-hidden">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          nodeTypes={nodeTypes}
          onNodesChange={onNodesChangeExtended}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          onEdgesDelete={onEdgesDelete}
          onNodeClick={onNodeClick}
          onNodesDelete={async (deletedNodes) => {
  for (const { id } of deletedNodes) {
    try {
      await removeComponent(id);
      if (processId) {
        delete posRef.current[id];
        savePositions(processId, posRef.current);
      }
    } catch (e) {
      console.error('Failed to delete component:', e);
    }
  }
}}

          nodesDraggable
          nodesConnectable
          elementsSelectable
          fitView
          proOptions={{ hideAttribution: true }}
          minZoom={0.25}
          maxZoom={2}
          onMoveEnd={onMoveEnd}
        >
          <Background />
          <Controls position="bottom-right" showInteractive={false} />
        </ReactFlow>
      </div>
    </div>
  );
}

// ---------- Export with provider ----------
export default function ProcessFlow() {
  return (
    <ReactFlowProvider>
      <ProcessFlowInner />
    </ReactFlowProvider>
  );
}
