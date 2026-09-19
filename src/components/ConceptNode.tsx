"use client";

import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";

interface ConceptNodeData {
  label: string;
  category: string;
  colors: { bg: string; border: string; text: string };
  expandable?: boolean;
  expanded?: boolean;
  isExpanding?: boolean;
  onExpand?: (nodeId: string) => void;
}

function ConceptNode({ id, data }: NodeProps<ConceptNodeData>) {
  return (
    <div className="relative">
      <div
        className="px-4 py-2.5 rounded-xl border-2 shadow-sm min-w-[80px] max-w-[200px] text-center cursor-grab active:cursor-grabbing"
        style={{
          backgroundColor: data.colors.bg,
          borderColor: data.colors.border,
          color: data.colors.text,
        }}
      >
        <Handle
          type="target"
          position={Position.Top}
          className="!w-2.5 !h-2.5 !border-2 !border-white"
          style={{ backgroundColor: data.colors.border }}
        />
        <p className="text-sm font-semibold leading-tight break-words">{data.label}</p>
        <Handle
          type="source"
          position={Position.Bottom}
          className="!w-2.5 !h-2.5 !border-2 !border-white"
          style={{ backgroundColor: data.colors.border }}
        />
      </div>
      {data.expandable && !data.expanded && (
        <button
          onClick={(e) => {
            e.stopPropagation();
            e.preventDefault();
            data.onExpand?.(id);
          }}
          onMouseDown={(e) => e.stopPropagation()}
          onPointerDown={(e) => e.stopPropagation()}
          disabled={data.isExpanding}
          className="absolute -bottom-4 left-1/2 -translate-x-1/2 w-7 h-7 rounded-full border-2 border-white shadow-md flex items-center justify-center text-sm font-bold text-white transition-transform hover:scale-125 disabled:opacity-50 z-10 cursor-pointer"
          style={{ backgroundColor: data.colors.border }}
          title="Expandir concepto"
        >
          {data.isExpanding ? (
            <span className="animate-spin">⟳</span>
          ) : (
            "+"
          )}
        </button>
      )}
      {data.expanded && (
        <div
          className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 rounded-full flex items-center justify-center text-[8px]"
          style={{ backgroundColor: data.colors.bg, border: `2px solid ${data.colors.border}` }}
          title="Nodo expandido"
        >
          ✓
        </div>
      )}
    </div>
  );
}

export default memo(ConceptNode);
