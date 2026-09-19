"use client";

import { useCallback, useMemo, useRef, useState } from "react";
import ReactFlow, {
  Node,
  Edge,
  Controls,
  Background,
  MiniMap,
  useNodesState,
  useEdgesState,
  addEdge,
  Connection,
  MarkerType,
  Panel,
} from "reactflow";
import "reactflow/dist/style.css";
import dagre from "dagre";
import ConceptNode from "@/components/ConceptNode";
import { toPng } from "html-to-image";

interface MapNodeData {
  id: string;
  label: string;
  category: "principal" | "secundario" | "definicion" | "ejemplo" | "norma";
}

interface MapEdgeData {
  source: string;
  target: string;
  label: string;
}

interface ConceptMapData {
  title: string;
  nodes: MapNodeData[];
  edges: MapEdgeData[];
}

const CATEGORY_COLORS: Record<string, { bg: string; border: string; text: string; mini: string }> = {
  principal: { bg: "#dbeafe", border: "#3b82f6", text: "#1e40af", mini: "#3b82f6" },
  secundario: { bg: "#e0e7ff", border: "#6366f1", text: "#3730a3", mini: "#6366f1" },
  definicion: { bg: "#dcfce7", border: "#22c55e", text: "#166534", mini: "#22c55e" },
  ejemplo: { bg: "#fef9c3", border: "#eab308", text: "#854d0e", mini: "#eab308" },
  norma: { bg: "#fce7f3", border: "#ec4899", text: "#9d174d", mini: "#ec4899" },
};

const BASE_NODE_WIDTH = 140;
const NODE_HEIGHT = 50;
const CHAR_WIDTH = 7.5;

function getNodeWidth(label: string): number {
  const textWidth = label.length * CHAR_WIDTH + 32;
  return Math.max(BASE_NODE_WIDTH, Math.min(textWidth, 280));
}

function layoutNodes(rawNodes: MapNodeData[], rawEdges: MapEdgeData[]): Node[] {
  const g = new dagre.graphlib.Graph();
  g.setDefaultEdgeLabel(() => ({}));
  g.setGraph({ rankdir: "TB", nodesep: 120, ranksep: 160, marginx: 50, marginy: 50 });

  for (const n of rawNodes) {
    g.setNode(n.id, { width: getNodeWidth(n.label), height: NODE_HEIGHT });
  }
  for (const e of rawEdges) {
    g.setEdge(e.source, e.target);
  }

  dagre.layout(g);

  return rawNodes.map((n) => {
    const pos = g.node(n.id);
    const w = getNodeWidth(n.label);
    const colors = CATEGORY_COLORS[n.category] || CATEGORY_COLORS.secundario;
    return {
      id: n.id,
      type: "concept",
      position: { x: pos.x - w / 2, y: pos.y - NODE_HEIGHT / 2 },
      data: { label: n.label, category: n.category, colors },
    };
  });
}

function buildEdges(rawEdges: MapEdgeData[]): Edge[] {
  return rawEdges.map((e, i) => ({
    id: `e-${i}`,
    source: e.source,
    target: e.target,
    label: e.label,
    type: "smoothstep",
    animated: false,
    style: { stroke: "#94a3b8", strokeWidth: 2 },
    labelStyle: { fontSize: 11, fontWeight: 500, fill: "#475569" },
    labelBgStyle: { fill: "#f8fafc", fillOpacity: 0.9 },
    labelBgPadding: [6, 3] as [number, number],
    labelBgBorderRadius: 4,
    markerEnd: { type: MarkerType.ArrowClosed, color: "#94a3b8", width: 16, height: 16 },
  }));
}

const nodeTypes = { concept: ConceptNode };

interface Props {
  initialData: ConceptMapData;
}

export default function ConceptMapEditor({ initialData }: Props) {
  const reactFlowWrapper = useRef<HTMLDivElement>(null);
  const [nodes, setNodes, onNodesChange] = useNodesState(layoutNodes(initialData.nodes, initialData.edges));
  const [edges, setEdges, onEdgesChange] = useEdgesState(buildEdges(initialData.edges));
  const [showLegend, setShowLegend] = useState(true);

  const onConnect = useCallback(
    (params: Connection) =>
      setEdges((eds) =>
        addEdge(
          {
            ...params,
            label: "se relaciona con",
            style: { stroke: "#94a3b8", strokeWidth: 2 },
            markerEnd: { type: MarkerType.ArrowClosed, color: "#94a3b8", width: 16, height: 16 },
          },
          eds
        )
      ),
    [setEdges]
  );

  const handleExportPng = useCallback(async () => {
    const el = document.querySelector(".react-flow") as HTMLElement;
    if (!el) return;
    try {
      const dataUrl = await toPng(el, {
        backgroundColor: "#ffffff",
        pixelRatio: 2,
        filter: (node) => {
          if (node?.classList?.contains("react-flow__minimap")) return false;
          if (node?.classList?.contains("react-flow__controls")) return false;
          if (node?.classList?.contains("react-flow__panel")) return false;
          return true;
        },
      });
      const link = document.createElement("a");
      link.download = `${initialData.title || "mapa-conceptual"}.png`;
      link.href = dataUrl;
      link.click();
    } catch {
      alert("No se pudo exportar la imagen. Intentá de nuevo.");
    }
  }, [initialData.title]);

  const addNode = useCallback(() => {
    const id = `n-new-${Date.now()}`;
    const newNode: Node = {
      id,
      type: "concept",
      position: { x: 200 + Math.random() * 400, y: 200 + Math.random() * 200 },
      data: {
        label: "Nuevo concepto",
        category: "secundario",
        colors: CATEGORY_COLORS.secundario,
      },
    };
    setNodes((nds) => [...nds, newNode]);
  }, [setNodes]);

  const miniMapNodeColor = useCallback((node: Node) => {
    return node.data?.colors?.mini || "#94a3b8";
  }, []);

  const legend = useMemo(
    () => [
      { key: "principal", label: "Principal" },
      { key: "secundario", label: "Secundario" },
      { key: "definicion", label: "Definición" },
      { key: "ejemplo", label: "Ejemplo" },
      { key: "norma", label: "Norma" },
    ],
    []
  );

  return (
    <div className="border border-gray-200 rounded-xl overflow-hidden bg-white" ref={reactFlowWrapper}>
      <div className="h-[600px] sm:h-[700px]">
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          onEdgesChange={onEdgesChange}
          onConnect={onConnect}
          nodeTypes={nodeTypes}
          fitView
          fitViewOptions={{ padding: 0.3 }}
          minZoom={0.2}
          maxZoom={2}
          deleteKeyCode="Delete"
          proOptions={{ hideAttribution: true }}
        >
          <Controls position="bottom-left" />
          <Background gap={20} size={1} color="#e2e8f0" />
          <MiniMap
            nodeColor={miniMapNodeColor}
            maskColor="rgba(0,0,0,0.08)"
            position="bottom-right"
            pannable
            zoomable
          />
          <Panel position="top-right">
            <div className="flex flex-col gap-2">
              <button
                onClick={addNode}
                className="bg-white border border-gray-300 text-gray-700 text-xs font-medium px-3 py-1.5 rounded-lg shadow-sm hover:bg-gray-50"
              >
                + Agregar nodo
              </button>
              <button
                onClick={handleExportPng}
                className="bg-white border border-gray-300 text-gray-700 text-xs font-medium px-3 py-1.5 rounded-lg shadow-sm hover:bg-gray-50"
              >
                Exportar PNG
              </button>
              <button
                onClick={() => setShowLegend((v) => !v)}
                className="bg-white border border-gray-300 text-gray-700 text-xs font-medium px-3 py-1.5 rounded-lg shadow-sm hover:bg-gray-50"
              >
                {showLegend ? "Ocultar" : "Mostrar"} leyenda
              </button>
            </div>
          </Panel>
          {showLegend && (
            <Panel position="top-left">
              <div className="bg-white/95 border border-gray-200 rounded-lg p-3 shadow-sm">
                <p className="text-xs font-semibold text-gray-600 mb-2">Categorías</p>
                <div className="flex flex-col gap-1.5">
                  {legend.map((item) => {
                    const c = CATEGORY_COLORS[item.key];
                    return (
                      <div key={item.key} className="flex items-center gap-2">
                        <span
                          className="w-3 h-3 rounded-full border-2"
                          style={{ backgroundColor: c.bg, borderColor: c.border }}
                        />
                        <span className="text-xs text-gray-600">{item.label}</span>
                      </div>
                    );
                  })}
                </div>
              </div>
            </Panel>
          )}
        </ReactFlow>
      </div>
      <div className="bg-gray-50 border-t border-gray-200 px-4 py-3">
        <p className="text-xs text-gray-500">
          Arrastrá los nodos para reorganizar. Conectá nodos arrastrando desde un punto de conexión a otro.
          Seleccioná y presioná <kbd className="px-1 py-0.5 bg-gray-200 rounded text-[10px]">Delete</kbd> para eliminar.
        </p>
      </div>
    </div>
  );
}
