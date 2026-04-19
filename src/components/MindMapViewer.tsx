// src/components/MindMapViewer.tsx
import React, { useState } from 'react';
import type { MindMapNodeData } from '../types';

const BRANCH_COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6', '#ec4899'];

interface MindMapViewerProps {
  node: MindMapNodeData;
  branchColor?: string;
}

export const MindMapViewer: React.FC<MindMapViewerProps> = ({ node, branchColor = '#3b82f6' }) => {
  const [isExpanded, setIsExpanded] = useState(true);
  const hasChildren = node.children && node.children.length > 0;

  return (
    <div className="mindmap">
      <div
        className="mindmap__node"
        onClick={() => hasChildren && setIsExpanded(!isExpanded)}
        style={{ borderColor: branchColor, cursor: hasChildren ? 'pointer' : 'default' }}
      >
        {node.label}
        {hasChildren && (
          <span className="mindmap__toggle" style={{ background: branchColor }}>
            {isExpanded ? '−' : '+'}
          </span>
        )}
      </div>

      {hasChildren && isExpanded && (
        <>
          <div className="mindmap__line" style={{ background: branchColor }} />
          {node.children!.length > 1 && (
            <div
              className="mindmap__horizontal-line"
              style={{
                width: `${Math.min(node.children!.length * 140, 1000)}px`,
                background: branchColor,
              }}
            />
          )}
          <div className="mindmap__children">
            {node.children!.map((child: MindMapNodeData, idx: number) => {
              const childColor = BRANCH_COLORS[(node.label.length + idx) % BRANCH_COLORS.length];
              return (
                <div key={idx} style={{ display: 'flex', flexDirection: 'column', alignItems: 'center' }}>
                  <div className="mindmap__line" style={{ background: childColor }} />
                  <MindMapViewer node={child} branchColor={childColor} />
                </div>
              );
            })}
          </div>
        </>
      )}
    </div>
  );
};
