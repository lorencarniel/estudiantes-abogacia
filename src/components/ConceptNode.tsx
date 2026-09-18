"use client";

import { memo } from "react";
import { Handle, Position, NodeProps } from "reactflow";

interface ConceptNodeData {
  label: string;
  category: string;
  colors: { bg: string; border: string; text: string };
}

function ConceptNode({ data }: NodeProps<ConceptNodeData>) {
  return (
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
  );
}

export default memo(ConceptNode);
