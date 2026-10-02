import React, { useEffect, useRef } from 'react';
import { Network } from 'vis-network';
import { DataSet } from 'vis-data';
import { Route, Layers, Zap } from 'lucide-react';
import type { ParsedGraphData } from '../engine/CsvParser';
import type { RouteResult } from '../engine/Pathfinding';

interface IsolatedRouteViewerProps {
  data: ParsedGraphData;
  route: RouteResult;
  title?: string;
  hoveredElement?: { type: 'node' | 'edge'; id: string } | null;
  onHoverElement: (element: { type: 'node' | 'edge'; id: string } | null) => void;
  selectedEdges?: string[];
  onSelectionChange?: (edgeIds: string[], toggle?: boolean) => void;
}

const EMPTY_ARRAY: string[] = [];

const IsolatedRouteViewer: React.FC<IsolatedRouteViewerProps> = ({
  data,
  route,
  title = "Isolated Route View",
  hoveredElement = null,
  onHoverElement,
  selectedEdges = EMPTY_ARRAY,
  onSelectionChange
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);
  const selectedEdgesRef = useRef(selectedEdges);
  useEffect(() => {
    selectedEdgesRef.current = selectedEdges;
  }, [selectedEdges]);

  useEffect(() => {
    if (!containerRef.current || !data || !route) return;

    // Filter data to ONLY include route nodes and edges
    const routeNodeSet = new Set(route.pathNodes);
    const routeEdgeSet = new Set(route.pathEdges);

    const itemsPerRow = 5;
    const spacingX = 220;
    const spacingY = 150;

    // Ordered list of unique nodes in the path
    const orderedNodeIds = Array.from(routeNodeSet);

    const visNodes = new DataSet(
      orderedNodeIds.map((nodeId, index) => {
        const node = data.nodes.find(n => n.id === nodeId)!;

        const row = Math.floor(index / itemsPerRow);
        const col = index % itemsPerRow;

        // Snake pattern: even rows L->R, odd rows R->L
        const isEvenRow = row % 2 === 0;
        const xPos = isEvenRow ? col * spacingX : (itemsPerRow - 1 - col) * spacingX;
        const yPos = row * spacingY;

        return {
          id: node.id,
          label: node.label.replace(' (', '\\n('),
          title: node.title,
          shape: 'box',
          margin: { top: 12, bottom: 12, left: 16, right: 16 },
          shapeProperties: {
            borderRadius: 6
          },
          borderWidth: 2,
          color: {
            background: 'rgba(24, 24, 27, 0.95)',
            border: '#10b981',
            highlight: {
              background: 'rgba(16, 185, 129, 0.15)',
              border: '#34d399'
            }
          },
          font: {
            color: '#e4e4e7',
            size: 14,
            face: 'Outfit',
            align: 'center'
          },
          shadow: { enabled: false },
          x: xPos,
          y: yPos,
          fixed: { x: true, y: true }
        };
      })
    );

    const mergedEdges = new Map<string, any>();

    const isolatedRawEdges = data.edges.filter(e => routeNodeSet.has(e.from) && routeNodeSet.has(e.to));

    isolatedRawEdges.forEach(edge => {
      const isRoute = routeEdgeSet.has(edge.id);
      const isHighCost = edge.cost > 100;

      let color = '#4f46e5'; // Indigo default for non-route
      let dashes = false;
      let shadow: any = { enabled: false };

      if (isHighCost) {
        if (isRoute) {
          color = '#3b82f6'; // Blue for high cost route
          dashes = true;
        } else {
          color = '#ef4444'; // Red for high cost non route
          dashes = true;
        }
      } else if (isRoute) {
        color = '#10b981'; // Solid green for normal route
      }

      const edgeKey1 = `${edge.from}-${edge.to}`;
      const edgeKey2 = `${edge.to}-${edge.from}`;

      if (mergedEdges.has(edgeKey2)) {
        const existing = mergedEdges.get(edgeKey2);
        existing.actualIds.push(edge.id);
        existing.arrows.from = { enabled: true, type: 'vee', scaleFactor: isRoute || existing.isRoute ? 1.0 : 0.6 };
        if (existing.originalCost !== edge.cost) existing.label = `${existing.originalCost} / ${edge.cost}`;

        if (isRoute) {
          if (existing.isHighCost) {
            existing.color.color = '#3b82f6';
          } else {
            existing.color.color = '#10b981';
          }
          existing.width = 4;
          existing.isRoute = true;
          existing.font.color = '#10b981';
        }
      } else if (mergedEdges.has(edgeKey1)) {
        const existing = mergedEdges.get(edgeKey1);
        existing.actualIds.push(edge.id);
        if (existing.originalCost !== edge.cost) existing.label = `${existing.originalCost} / ${edge.cost}`;

        if (isRoute) {
          if (existing.isHighCost) {
            existing.color.color = '#3b82f6';
          } else {
            existing.color.color = '#10b981';
          }
          existing.width = 4;
          existing.isRoute = true;
          existing.font.color = '#10b981';
        }
      } else {
        mergedEdges.set(edgeKey1, {
          id: edgeKey1,
          actualIds: [edge.id],
          from: edge.from,
          to: edge.to,
          originalCost: edge.cost,
          isRoute: isRoute,
          isHighCost: isHighCost,
          label: edge.cost.toString(),
          font: {
            color: isRoute ? '#10b981' : '#a1a1aa',
            size: 12,
            align: 'horizontal'
          },
          color: {
            color: color,
            highlight: '#06b6d4',
            hover: '#fbbf24'
          },
          width: isRoute ? 4 : 1.5,
          dashes: dashes,
          shadow: shadow,
          smooth: false,
          arrows: {
            to: {
              enabled: true,
              type: 'vee',
              scaleFactor: isRoute ? 1.0 : 0.6
            }
          }
        });
      }
    });

    const finalEdges = Array.from(mergedEdges.values()).filter(e => e.isRoute);
    const visEdges = new DataSet(finalEdges);

    const networkData = {
      nodes: visNodes as any,
      edges: visEdges as any
    };

    const options = {
      physics: {
        enabled: false
      },
      interaction: {
        hover: true,
        tooltipDelay: 200,
        zoomView: true,
        dragView: true,
        dragNodes: false,
        multiselect: true,
        selectConnectedEdges: false
      },
      edges: {
        selectionWidth: 4,
        color: {
          highlight: '#06b6d4'
        }
      }
    };

    const network = new Network(containerRef.current, networkData, options);
    networkRef.current = network;

    const syncEdgeSelectionOnly = () => {
      if (!networkRef.current) return;
      if (selectedEdgesRef.current.length > 0) {
        const visualIdsToSelect = new Set<string>();
        selectedEdgesRef.current.forEach(id => {
          const edgeInfo = data.edges.find(e => e.id === id);
          if (edgeInfo) {
            const key1 = `${edgeInfo.from}-${edgeInfo.to}`;
            const key2 = `${edgeInfo.to}-${edgeInfo.from}`;
            if (mergedEdges.has(key1)) visualIdsToSelect.add(key1);
            else if (mergedEdges.has(key2)) visualIdsToSelect.add(key2);
          }
        });
        networkRef.current.setSelection({ nodes: [], edges: Array.from(visualIdsToSelect) });
      } else {
        networkRef.current.unselectAll();
      }
    };

    network.on('selectNode', () => {
      // Disallow node selection completely
      syncEdgeSelectionOnly();
    });

    // Events
    network.on('hoverNode', (params) => {
      onHoverElement({ type: 'node', id: params.node });
    });
    network.on('blurNode', () => {
      onHoverElement(null);
    });
    network.on('hoverEdge', (params) => {
      const visualId = params.edge;
      const edgeData = mergedEdges.get(visualId);
      if (edgeData && edgeData.actualIds) {
        onHoverElement({ type: 'edge', id: edgeData.actualIds[0] });
      }
    });
    network.on('blurEdge', () => {
      onHoverElement(null);
    });

    network.on('click', (params) => {
      // 1. If a node was clicked directly, do NOT select node or its incident edges
      if (params.nodes && params.nodes.length > 0) {
        syncEdgeSelectionOnly();
        return;
      }

      // 2. Only if an edge was clicked directly
      if (params.edges && params.edges.length > 0) {
        if (onSelectionChange) {
          const selectedOriginalIds: string[] = [];
          params.edges.forEach((visualId: string) => {
            const edgeData = mergedEdges.get(visualId);
            if (edgeData && edgeData.actualIds) {
              selectedOriginalIds.push(...edgeData.actualIds);
            }
          });
          onSelectionChange(selectedOriginalIds, true); // Toggle!
        }
      } else {
        if (onSelectionChange) {
          onSelectionChange([], false); // Clear!
        }
      }
    });

    const fitTimer = setTimeout(() => {
      if (networkRef.current) {
        networkRef.current.fit({
          animation: { duration: 250, easingFunction: 'easeInOutQuad' }
        });
      }
    }, 60);

    return () => {
      clearTimeout(fitTimer);
      if (networkRef.current) {
        networkRef.current.destroy();
        networkRef.current = null;
      }
    };
  }, [data, route]);

  useEffect(() => {
    if (networkRef.current) {
      const edgesDs = (networkRef.current as any).body.data.edges;

      // 1. Clear any previously forced hover colors
      const clearUpdates: any[] = [];
      edgesDs.forEach((edge: any) => {
        if (edge.originalHoverColor) {
          clearUpdates.push({ id: edge.id, color: edge.originalHoverColor, originalHoverColor: null });
        }
      });
      if (clearUpdates.length > 0) {
        edgesDs.update(clearUpdates);
      }

      // 2. Apply forced hover color if an edge is hovered from another view
      if (hoveredElement && hoveredElement.type === 'edge') {
        const edgeInfo = data.edges.find(e => e.id === hoveredElement.id);
        if (edgeInfo) {
          const key1 = `${edgeInfo.from}-${edgeInfo.to}`;
          const key2 = `${edgeInfo.to}-${edgeInfo.from}`;
          let targetKey = edgesDs.get(key1) ? key1 : edgesDs.get(key2) ? key2 : null;

          if (targetKey) {
            const edge = edgesDs.get(targetKey);
            edgesDs.update({
              id: targetKey,
              originalHoverColor: edge.color,
              color: { ...edge.color, color: '#f97316' } // Force orange
            });
          }
        }
      }

      // 3. Apply Node Hover Selection (if any)
      if (hoveredElement && hoveredElement.type === 'node') {
        networkRef.current.setSelection({ nodes: [hoveredElement.id], edges: [] }, { highlightEdges: false });
        return;
      }

      if (selectedEdges.length === 0) {
        networkRef.current.unselectAll();
      } else {
        const visualIdsToSelect = new Set<string>();
        selectedEdges.forEach(id => {
          const edgeInfo = data.edges.find(e => e.id === id);
          if (edgeInfo) {
            const key1 = `${edgeInfo.from}-${edgeInfo.to}`;
            const key2 = `${edgeInfo.to}-${edgeInfo.from}`;
            if (edgesDs.get(key1)) visualIdsToSelect.add(key1);
            else if (edgesDs.get(key2)) visualIdsToSelect.add(key2);
          }
        });
        networkRef.current.setSelection({ nodes: [], edges: Array.from(visualIdsToSelect) });
      }
    }
  }, [selectedEdges, hoveredElement, data.edges]);

  return (
    <div style={{ 
      position: 'absolute', 
      top: 0, 
      left: 0, 
      right: 0, 
      bottom: 0, 
      background: 'var(--bg-secondary)', 
      borderTop: '1px solid var(--border)',
      display: 'flex',
      flexDirection: 'column'
    }}>
      {/* Top Header & Metrics Bar (dedicated bar outside canvas so it never overlaps nodes) */}
      <div style={{
        padding: '8px 16px',
        background: 'rgba(24, 24, 27, 0.95)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        justifyContent: 'space-between',
        alignItems: 'center',
        flexShrink: 0,
        zIndex: 5
      }}>
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '8px',
          color: 'var(--text-primary)',
          fontSize: '0.875rem',
          fontWeight: 600
        }}>
          <Route size={16} color="#10b981" />
          <span>{title}</span>
        </div>

        {/* Route Metrics Badges */}
        <div style={{
          display: 'flex',
          alignItems: 'center',
          gap: '20px'
        }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              background: 'rgba(16, 185, 129, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#10b981'
            }}>
              <Zap size={16} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Total Cost
              </span>
              <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#10b981', lineHeight: 1 }}>
                {route.totalCost.toFixed(2)}
              </span>
            </div>
          </div>

          <div style={{ width: '1px', height: '24px', background: 'var(--border)' }} />

          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{
              width: '28px',
              height: '28px',
              borderRadius: '6px',
              background: 'rgba(59, 130, 246, 0.15)',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              color: '#3b82f6'
            }}>
              <Layers size={16} />
            </div>
            <div style={{ display: 'flex', flexDirection: 'column' }}>
              <span style={{ fontSize: '0.65rem', textTransform: 'uppercase', letterSpacing: '0.05em', color: 'var(--text-secondary)', fontWeight: 600 }}>
                Nodes Traversed
              </span>
              <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#60a5fa', lineHeight: 1 }}>
                {route.pathNodes.length} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)' }}>nodes</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Network Canvas (Clean and unobstructed) */}
      <div
        ref={containerRef}
        style={{ flex: 1, width: '100%', height: '100%', minHeight: 0, position: 'relative' }}
      />
    </div>
  );
};

export default IsolatedRouteViewer;
