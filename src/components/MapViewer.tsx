import React, { useEffect, useRef } from 'react';
import { Network } from 'vis-network';
import { DataSet } from 'vis-data';
import type { ParsedGraphData } from '../engine/CsvParser';
import { useI18n } from '../i18n';

interface MapViewerProps {
  data: ParsedGraphData;
  dataB?: ParsedGraphData | null;
  showComparedMap?: boolean;
  fileNameA?: string;
  fileNameB?: string;
  routeNodes?: string[];
  routeEdges?: string[];
  hoveredElement?: { type: 'node' | 'edge'; id: string } | null;
  onHoverElement?: (element: { type: 'node' | 'edge'; id: string } | null) => void;
  selectedEdges?: string[];
  onSelectionChange?: (edgeIds: string[], toggle?: boolean) => void;
  cancelledEdges?: Set<string>;
  cancelledEdgesB?: Set<string>;
  sourceId?: string;
  destId?: string;
  totalRoutes?: number;
  routeHops?: number[];
  mainRouteIndex?: number;
  onMainRouteIndexChange?: (idx: number) => void;
}

const EMPTY_ARRAY: string[] = [];

const MapViewer: React.FC<MapViewerProps> = ({
  data,
  dataB,
  showComparedMap,
  fileNameA,
  fileNameB,
  routeNodes = EMPTY_ARRAY,
  routeEdges = EMPTY_ARRAY,
  hoveredElement = null,
  onHoverElement,
  selectedEdges = EMPTY_ARRAY,
  onSelectionChange,
  cancelledEdges,
  cancelledEdgesB,
  sourceId,
  destId,
  totalRoutes = 0,
  routeHops = [],
  mainRouteIndex = 0,
  onMainRouteIndexChange
}) => {
  const [showDropdown, setShowDropdown] = React.useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);
  const selectedEdgesRef = useRef(selectedEdges);
  const { t, dir } = useI18n();
  useEffect(() => {
    selectedEdgesRef.current = selectedEdges;
  }, [selectedEdges]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setShowDropdown(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  useEffect(() => {
    if (!containerRef.current || !data) return;

    // Convert our internal data structure to vis-network DataSets
    const allNodes = new Map();
    const mergedEdges = new Map();

    const addNode = (node: any, sourceMap: string) => {
      if (allNodes.has(node.id)) {
        allNodes.get(node.id).sources.push(sourceMap);
      } else {
        allNodes.set(node.id, { ...node, sources: [sourceMap] });
      }
    };

    data.nodes.forEach(n => addNode(n, 'A'));
    if (showComparedMap && dataB) {
      dataB.nodes.forEach(n => addNode(n, 'B'));
    }

    const visNodes = new DataSet(
      Array.from(allNodes.values()).map(node => {
        let borderColor = '#4f46e5';
        let bgColor = '#18181b';
        if (showComparedMap) {
          if (node.sources.includes('A') && !node.sources.includes('B')) {
            borderColor = '#fb923c'; // Orange (only in A)
          } else if (!node.sources.includes('A') && node.sources.includes('B')) {
            borderColor = '#10b981'; // Green (only in B)
          }
        }

        return {
          id: node.id,
          label: node.label.replace(' (', '\n('),
          originalLabel: node.label.replace(' (', '\n('),
          title: node.title,
          shape: 'box',
          margin: { top: 8, bottom: 8, left: 12, right: 12 },
          shapeProperties: {
            borderRadius: 6
          },
          borderWidth: 2,
          color: {
            background: bgColor,
            border: borderColor,
            highlight: {
              background: '#312e81',
              border: borderColor
            }
          },
          font: {
            color: '#e4e4e7',
            size: 13,
            face: 'Outfit',
            align: 'center'
          },
          sources: node.sources
        };
      })
    );

    const addEdge = (edge: any, sourceMap: string) => {
      const isHighCost = edge.cost > 100;
      const edgeKey1 = `${edge.from}-${edge.to}`;
      const edgeKey2 = `${edge.to}-${edge.from}`;
      
      let targetKey = edgeKey1;
      let existing = mergedEdges.get(edgeKey1);
      if (!existing && mergedEdges.has(edgeKey2)) {
        targetKey = edgeKey2;
        existing = mergedEdges.get(edgeKey2);
      }

      if (existing) {
        if (!existing.actualIds.includes(edge.id)) {
           existing.actualIds.push(edge.id);
        }
        if (targetKey === edgeKey2) {
          existing.arrows.from = { enabled: true, scaleFactor: 0.5 };
        }
        if (existing.originalCost !== edge.cost) {
          existing.label = `${existing.originalCost} / ${edge.cost}`;
        }
        if (!existing.sources.includes(sourceMap)) {
           existing.sources.push(sourceMap);
        }
      } else {
        mergedEdges.set(edgeKey1, {
          id: edgeKey1,
          actualIds: [edge.id],
          sources: [sourceMap],
          from: edge.from,
          to: edge.to,
          label: edge.cost.toString(),
          originalCost: edge.cost,
          isHighCost: isHighCost,
          width: 1.5,
          dashes: isHighCost,
          shadow: { enabled: false },
          smooth: false,
          arrows: {
            to: {
              enabled: true,
              scaleFactor: 0.5
            }
          },
          length: edge.cost <= 5 ? 90 : edge.cost <= 40 ? 200 : 400
        });
      }
    };

    data.edges.forEach(e => addEdge(e, 'A'));
    if (showComparedMap && dataB) {
      dataB.edges.forEach(e => addEdge(e, 'B'));
    }

    const finalEdges = Array.from(mergedEdges.values()).map(edge => {
      let color = edge.isHighCost ? '#ef4444' : '#6366f1';
      if (showComparedMap) {
        if (edge.sources.includes('A') && !edge.sources.includes('B')) {
          color = '#fb923c';
        } else if (!edge.sources.includes('A') && edge.sources.includes('B')) {
          color = '#10b981';
        }
      }
      return {
        ...edge,
        font: {
          color: '#ffffff',
          size: 10,
          strokeWidth: 0,
          strokeColor: 'transparent',
          face: 'Outfit',
          align: 'horizontal'
        },
        color: {
          color: color,
          highlight: '#06b6d4',
          hover: '#fbbf24'
        }
      };
    });

    const visEdges = new DataSet(finalEdges);

    const networkData = {
      nodes: visNodes as any,
      edges: visEdges as any
    };

    const options = {
      physics: {
        enabled: true,
        barnesHut: {
          gravitationalConstant: -8000, // Strong global repulsion
          centralGravity: 0.1,
          springConstant: 0.04,
          damping: 0.9, // Very high damping to eliminate rotation and floating
          avoidOverlap: 0.5
        },
        stabilization: {
          enabled: true,
          iterations: 300,
          updateInterval: 50,
          fit: true
        },
        minVelocity: 2 // Sleep sooner to prevent endless micro-adjustments
      },
      interaction: {
        hover: true,
        tooltipDelay: 200,
        zoomView: true,
        dragView: true,
        dragNodes: true,
        multiselect: true,
        selectConnectedEdges: false
      },
      edges: {
        hoverWidth: 2,
        selectionWidth: 4,
        color: {
          highlight: '#06b6d4' // Bright cyan for clear visibility
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
          let edgeInfo = data.edges.find(e => e.id === id);
          if (!edgeInfo && dataB) {
            edgeInfo = dataB.edges.find(e => e.id === id);
          }
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

    network.on('click', (params) => {
      // 1. If a node was clicked directly, do NOT select node or any of its edges
      if (params.nodes && params.nodes.length > 0) {
        syncEdgeSelectionOnly();
        return;
      }

      // 2. Only if an edge was clicked directly
      if (params.edges && params.edges.length > 0) {
        if (onSelectionChange) {
          const selectedOriginalIds: string[] = [];
          const visualId = params.edges[0]; // Only select the top-most clicked edge
          const edgeData = mergedEdges.get(visualId);
          if (edgeData && edgeData.actualIds) {
            selectedOriginalIds.push(...edgeData.actualIds);
          }
          onSelectionChange(selectedOriginalIds, true); // Toggle!
        }
      } else {
        // Clicked empty canvas
        if (onSelectionChange) {
          onSelectionChange([], false); // Clear!
        }
      }
    });

    network.on('hoverEdge', (params) => {
      const visualId = params.edge;
      const edgeData = mergedEdges.get(visualId);
      if (edgeData && edgeData.actualIds && onHoverElement) {
        onHoverElement({ type: 'edge', id: edgeData.actualIds[0] });
      }
    });

    network.on('blurEdge', () => {
      if (onHoverElement) onHoverElement(null);
    });

    network.once('stabilizationIterationsDone', () => {
      network.setOptions({ physics: false });
    });

    return () => {
      if (networkRef.current) {
        networkRef.current.destroy();
        networkRef.current = null;
      }
    };
  }, [data, dataB, showComparedMap]);

  // Dynamic styling updates based on route or cancelled state (WITHOUT resetting layout!)
  useEffect(() => {
    if (!networkRef.current) return;
    const nodesDs = (networkRef.current as any).body.data.nodes;
    const edgesDs = (networkRef.current as any).body.data.edges;

    const nodeUpdates: any[] = [];
    nodesDs.forEach((node: any) => {
      const isRoute = routeNodes.includes(node.id);
      let bgColor = isRoute ? '#10b981' : '#1c1c1f';
      let borderColor = isRoute ? '#047857' : '#6366f1';
      let labelPrefix = '';

      const isStartDest = sourceId === node.id || destId === node.id;

      if (showComparedMap && node.sources) {
        if (node.sources.includes('A') && !node.sources.includes('B')) {
          borderColor = '#fb923c';
        } else if (!node.sources.includes('A') && node.sources.includes('B')) {
          borderColor = '#d946ef';
        }
      }

      if (isStartDest) {
        bgColor = '#064e3b'; // dark green fill to stand out
        borderColor = '#10b981'; // green outline
      }

      nodeUpdates.push({
        id: node.id,
        label: labelPrefix + node.originalLabel,
        margin: isStartDest ? { top: 12, bottom: 12, left: 18, right: 18 } : { top: 8, bottom: 8, left: 12, right: 12 },
        color: {
          background: bgColor,
          border: borderColor
        },
        font: { size: isStartDest ? 18 : (isRoute ? 14 : 12) },
        borderWidth: isStartDest ? 3 : (isRoute ? 2 : 1),
        shadow: { enabled: false }
      });
    });
    if (nodeUpdates.length > 0) nodesDs.update(nodeUpdates);

    const edgeUpdates: any[] = [];
    edgesDs.forEach((edge: any) => {
      const isRoute = edge.actualIds.some((id: string) => routeEdges.includes(id));
      
      const inA = !showComparedMap || (edge.sources && edge.sources.includes('A'));
      const inB = showComparedMap && edge.sources && edge.sources.includes('B');
      
      const cancelledA = inA && edge.actualIds.some((id: string) => cancelledEdges?.has(id));
      const cancelledB = inB && edge.actualIds.some((id: string) => cancelledEdgesB?.has(id));
      
      const effectiveA = inA && !cancelledA;
      const effectiveB = inB && !cancelledB;
      const isFullyCancelled = !effectiveA && !effectiveB;

      let color = edge.isHighCost ? '#ef4444' : '#6366f1';
      let dashes = edge.isHighCost;
      let width = 1.5;

      if (isFullyCancelled) {
        color = '#d4d4d8';
        dashes = false;
      } else if (showComparedMap) {
        if (effectiveA && !effectiveB) {
          color = '#fb923c'; // effectively Map A only
        } else if (!effectiveA && effectiveB) {
          color = '#d946ef'; // effectively Map B only
        } else if (effectiveA && effectiveB) {
          color = '#6366f1'; // effectively in Both maps
        }
      }

      if (!isFullyCancelled) {
        if (edge.isHighCost) {
          if (isRoute) {
            color = '#3b82f6'; // Blue for high-cost route
            dashes = true;
            width = 4;
          } else {
            color = '#ef4444'; // Red for high cost non-route
            dashes = true;
          }
        } else if (isRoute) {
          color = '#10b981'; // Bright green for normal route
          width = 4;
        }
      }

      edgeUpdates.push({
        id: edge.id,
        color: { color, highlight: '#06b6d4', hover: '#fbbf24' },
        width,
        dashes,
        shadow: { enabled: false }, // Explicitly disable shadow
        font: { color: isRoute ? '#10b981' : (isFullyCancelled ? '#d4d4d8' : '#a1a1aa') },
        arrows: {
          to: edge.arrows?.to?.enabled !== false ? { enabled: true, scaleFactor: isRoute ? 0.8 : 0.5 } : { enabled: false },
          from: edge.arrows?.from?.enabled ? { enabled: true, scaleFactor: isRoute ? 0.8 : 0.5 } : { enabled: false }
        }
      });
    });
    if (edgeUpdates.length > 0) edgesDs.update(edgeUpdates);

  }, [routeNodes, routeEdges, cancelledEdges, cancelledEdgesB, sourceId, destId, showComparedMap]);


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

      // 4. Always ensure selected edges are correctly highlighted
      if (selectedEdges.length > 0) {
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
      } else {
        networkRef.current.unselectAll();
      }
    }
  }, [hoveredElement, selectedEdges, data.edges]);

  return (
    <div style={{ position: 'absolute', top: 0, left: 0, right: 0, bottom: 0 }}>
      <div
        ref={containerRef}
        style={{ width: '100%', height: '100%' }}
      />

      {/* Main Route Selector Overlay */}
      {totalRoutes > 1 && (
        <div 
          ref={dropdownRef}
          style={{
            position: 'absolute',
            top: 16, // upper left corner
            left: 16,
            zIndex: 20
          }}
        >
          <div style={{ position: 'relative' }}>
            <button
              onClick={() => setShowDropdown(!showDropdown)}
              style={{
                display: 'flex', alignItems: 'center', gap: '8px', 
                background: 'rgba(16, 185, 129, 0.1)', 
                border: '1px solid #10b981', 
                padding: '4px 8px', 
                borderRadius: '6px',
                color: '#10b981',
                fontSize: '0.75rem',
                fontWeight: 600,
                cursor: 'pointer',
                fontFamily: 'inherit'
              }}
            >
              {t('map.showingRoute')} {mainRouteIndex + 1} ▾
            </button>
            
            {showDropdown && (
              <div style={{
                position: 'absolute',
                top: '100%',
                left: 0,
                marginTop: '4px',
                background: 'var(--bg-secondary)',
                border: '1px solid var(--border)',
                borderRadius: '6px',
                padding: '8px',
                display: 'flex',
                flexDirection: 'column',
                gap: '6px',
                minWidth: '120px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                whiteSpace: 'nowrap',
                maxHeight: '160px',
                overflowY: 'auto',
                boxSizing: 'border-box'
              }}>
                {Array.from({ length: totalRoutes }).map((_, i) => (
                  <button
                    key={i}
                    onClick={() => {
                      onMainRouteIndexChange?.(i);
                      setShowDropdown(false);
                    }}
                    style={{
                      background: 'transparent',
                      color: mainRouteIndex === i ? '#10b981' : 'var(--text-primary)',
                      border: 'none',
                      padding: 0,
                      textAlign: 'left',
                      cursor: 'pointer',
                      fontSize: '0.75rem',
                      fontWeight: mainRouteIndex === i ? 600 : 400,
                      display: 'flex',
                      alignItems: 'center',
                      gap: '8px',
                      opacity: mainRouteIndex === i ? 1 : 0.7,
                      fontFamily: 'inherit'
                    }}
                  >
                    {mainRouteIndex === i ? '✓ ' : <span style={{ width: '12px' }} />}
                    {t('isolated.route')} {i + 1} {routeHops[i] !== undefined && `(${routeHops[i]} ${t('isolated.hopsCount')})`}
                  </button>
                ))}
              </div>
            )}
          </div>
        </div>
      )}

      {/* Legend Overlay */}
      <div style={{
        position: 'absolute',
        bottom: 16,
        left: 16,
        background: 'var(--bg-panel)',
        backdropFilter: 'blur(8px)',
        border: '1px solid var(--border)',
        padding: '12px 16px',
        borderRadius: '8px',
        display: 'flex',
        flexDirection: 'column',
        gap: '8px',
        fontSize: '0.875rem',
        color: 'var(--text-secondary)',
        pointerEvents: 'none',
        zIndex: 10
      }} dir={dir}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '24px', height: '2px', background: '#6366f1' }}></div>
          <span>{t('map.likelyFiber')}</span>
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <div style={{ width: '24px', height: '2px', borderTop: '2px dashed #ef4444' }}></div>
          <span>{t('map.likelyRF')}</span>
        </div>
        {cancelledEdges && cancelledEdges.size > 0 && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
            <div style={{ width: '24px', height: '2px', background: '#d4d4d8' }}></div>
            <span>{t('map.canceled')}</span>
          </div>
        )}
        {showComparedMap && (
          <>
            <div style={{ borderTop: '1px solid var(--border)', margin: '4px 0' }}></div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '24px', height: '2px', background: '#fb923c' }}></div>
              <span>{t('legend.mapAOnly')}</span>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <div style={{ width: '24px', height: '2px', background: '#d946ef' }}></div>
              <span>{t('legend.mapBOnly')}</span>
            </div>
            <div style={{ marginTop: '4px', fontSize: '0.75rem' }}>
              {fileNameA && <div>{t('legend.mapAFile').replace('{file}', fileNameA)}</div>}
              {fileNameB && <div>{t('legend.mapBFile').replace('{file}', fileNameB)}</div>}
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default MapViewer;
