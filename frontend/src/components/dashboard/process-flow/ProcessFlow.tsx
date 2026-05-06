'use client';

import { useToast } from '@/components/ui/use-toast';
import { useAppState } from '@/lib/context/AppStateContext';
import { validateConnection } from '@/lib/validation/validateConnection';
import React, { useCallback, useEffect, useMemo, useRef } from 'react';
import ReactFlow, {
    addEdge,
    Background,
    Connection,
    Controls,
    Edge,
    Handle,
    MarkerType,
    Node,
    NodeProps,
    OnEdgesDelete,
    OnMove,
    OnNodesChange,
    Position,
    ReactFlowProvider,
    useEdgesState,
    useNodesState,
    useReactFlow,
    Viewport,
} from 'reactflow';
import 'reactflow/dist/style.css';
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
  const { toast } = useToast();
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
  const deletingRef = useRef<Set<string>>(new Set());

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
    
    // Clean up positions for deleted components (prevents stale data)
    const validComponentIds = new Set(processComponents.map((c) => c.id));
    const cleanedPositions: PosMap = {};
    Object.entries(posRef.current).forEach(([compId, pos]) => {
      if (validComponentIds.has(compId)) {
        cleanedPositions[compId] = pos;
      }
    });
    posRef.current = cleanedPositions;
    if (Object.keys(cleanedPositions).length !== Object.keys(posRef.current).length) {
      savePositions(processId, cleanedPositions);
    }

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
      if (connection.source === connection.target) return; // Prevent self-connections

      const sourceComp = topology?.components.find((c) => c.id === connection.source);
      const targetComp = topology?.components.find((c) => c.id === connection.target);

      if (!sourceComp || !targetComp) return;

      try {
        const validation = validateConnection(sourceComp, targetComp, 'strict_purdue');
        if (validation.action === 'deny') {
          toast({
            title: "Connection Blocked",
            description: validation.error?.message || "Invalid connection.",
            variant: "destructive",
          });
          return;
        } else if (validation.action === 'warn') {
          toast({
            title: "Connection Warning",
            description: validation.warning?.message || "Proceeding with caution.",
            variant: "destructive",
          });
        }
      } catch (err) {
        console.warn('Validation error:', err);
        // Continue anyway if validation fails
      }

      try {
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
      } catch (err) {
        console.error('Failed to create connection:', err);
        toast({
          title: "Connection Failed",
          description: "Failed to create connection. Please try again.",
          variant: "destructive",
        });
      }
    },
    [topology, toast, addConnectivity, setEdges]
  );

  const deletingEdgesRef = useRef<Set<string>>(new Set());

  const onEdgesDelete: OnEdgesDelete = useCallback(
    async (eds: Edge[]) => {
      // Prevent duplicate deletion attempts for the same edge
      const edgesToDelete = eds.filter((e) => !deletingEdgesRef.current.has(e.id));
      
      if (edgesToDelete.length === 0) return;
      
      // Mark these edges as currently being deleted
      edgesToDelete.forEach((e) => deletingEdgesRef.current.add(e.id));

      try {
        await Promise.all(
          edgesToDelete.map(async (e) => {
            try {
              await removeConnectivity(e.id);
            } catch (err) {
              console.warn('Edge deletion warning:', err);
            }
          })
        );
      } finally {
        // Remove from deleting set after completion
        edgesToDelete.forEach((e) => deletingEdgesRef.current.delete(e.id));
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
            // Prevent duplicate deletion attempts for the same node
            const nodesToDelete = deletedNodes.filter(
              (node) => !deletingRef.current.has(node.id)
            );
            
            if (nodesToDelete.length === 0) return;
            
            // Mark these nodes as currently being deleted
            nodesToDelete.forEach((node) => deletingRef.current.add(node.id));

            try {
              // Delete all components in parallel
              await Promise.all(
                nodesToDelete.map(async ({ id }) => {
                  try {
                    await removeComponent(id);
                  } catch (e) {
                    console.error('Failed to delete component:', id, e);
                  }
                })
              );
              
              // Clean up position cache
              if (processId) {
                nodesToDelete.forEach(({ id }) => {
                  delete posRef.current[id];
                });
                // Save the updated position map
                savePositions(processId, posRef.current);
              }
            } finally {
              // Remove from deleting set after completion
              nodesToDelete.forEach((node) => deletingRef.current.delete(node.id));
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
