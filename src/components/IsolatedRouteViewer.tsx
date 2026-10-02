import React, { useEffect, useRef } from 'react';
import { Network } from 'vis-network';
import { DataSet } from 'vis-data';
import { Route, Layers, Zap } from 'lucide-react';
import type { ParsedGraphData } from '../engine/CsvParser';
import type { RouteResult } from '../engine/Pathfinding';
import { useI18n } from '../i18n';

interface IsolatedRouteViewerProps {
  data: ParsedGraphData;
  routes: RouteResult[];
  title?: string;
  totalRoutes?: number;
  hoveredElement?: { type: 'node' | 'edge'; id: string } | null;
  onHoverElement: (element: { type: 'node' | 'edge'; id: string } | null) => void;
  selectedEdges?: string[];
  onSelectionChange?: (edgeIds: string[], toggle?: boolean) => void;
  sourceId?: string;
  destId?: string;
  selectedRouteIndices?: number[];
  onSelectedRoutesChange?: (indices: number[]) => void;
}

const EMPTY_ARRAY: string[] = [];

const IsolatedRouteViewer: React.FC<IsolatedRouteViewerProps> = ({
  data,
  routes,
  title = "Isolated Route View",
  totalRoutes = 0,
  hoveredElement = null,
  onHoverElement,
  selectedEdges = EMPTY_ARRAY,
  onSelectionChange,
  sourceId,
  destId,
  selectedRouteIndices = [],
  onSelectedRoutesChange
}) => {
  const [showDropdown, setShowDropdown] = React.useState(false);
  const containerRef = useRef<HTMLDivElement>(null);
  const networkRef = useRef<Network | null>(null);
  const selectedEdgesRef = useRef(selectedEdges);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const { t, dir } = useI18n();

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
    selectedEdgesRef.current = selectedEdges;
  }, [selectedEdges]);

  useEffect(() => {
    if (!containerRef.current || !data || !routes || routes.length === 0) return;

    const routeNodeSet = new Set<string>();
    const routeEdgeSet = new Set<string>();
    const edgeToRoutes = new Map<string, number[]>();
    const nodeToRoutes = new Map<string, number[]>();
    const nodeHopCounts = new Map<string, number>();

    const activeRoutes = selectedRouteIndices.map(i => routes[i]).filter(Boolean);
    if (activeRoutes.length === 0) return;

    activeRoutes.forEach((route, activeIdx) => {
      route.pathNodes.forEach((nodeId, hopIdx) => {
        routeNodeSet.add(nodeId);
        if (!nodeToRoutes.has(nodeId)) nodeToRoutes.set(nodeId, []);
        nodeToRoutes.get(nodeId)!.push(activeIdx);

        if (!nodeHopCounts.has(nodeId)) {
          nodeHopCounts.set(nodeId, hopIdx);
        } else {
          nodeHopCounts.set(nodeId, Math.max(nodeHopCounts.get(nodeId)!, hopIdx));
        }
      });
      
      route.pathEdges.forEach(edgeId => {
        routeEdgeSet.add(edgeId);
        if (!edgeToRoutes.has(edgeId)) edgeToRoutes.set(edgeId, []);
        edgeToRoutes.get(edgeId)!.push(activeIdx);
      });
    });

    const allVisNodes: any[] = [];
    
    routeNodeSet.forEach((nodeId) => {
        const node = data.nodes.find(n => n.id === nodeId)!;
        
        const routesUsingNode = nodeToRoutes.get(nodeId) || [];
        const isJointNode = routesUsingNode.length === routes.length;
        let nodeColor = '#10b981';
        if (!isJointNode) {
          if (routesUsingNode.includes(0)) nodeColor = '#f97316'; 
          else if (routesUsingNode.includes(1)) nodeColor = '#3b82f6';
          else if (routesUsingNode.includes(2)) nodeColor = '#a855f7'; 
        }

        let bgColor = 'rgba(24, 24, 27, 0.95)';
        let isStartDest = sourceId === node.id || destId === node.id;
        if (isStartDest) {
          bgColor = '#064e3b';
          nodeColor = '#10b981'; // Green border
        }

        allVisNodes.push({
          id: node.id,
          label: node.label.replace(' (', '\n('),
          title: node.title,
          shape: 'box',
          margin: isStartDest ? { top: 16, bottom: 16, left: 24, right: 24 } : { top: 12, bottom: 12, left: 16, right: 16 },
          shapeProperties: { borderRadius: 6 },
          borderWidth: isStartDest ? 3 : 2,
          color: {
            background: bgColor,
            border: nodeColor,
            highlight: { background: 'rgba(16, 185, 129, 0.15)', border: '#34d399' }
          },
          font: { color: '#e4e4e7', size: isStartDest ? 18 : 14, face: 'Outfit', align: 'center' },
          shadow: false
        });
    });

    const allVisEdges: any[] = [];
    const traversedEdges = data.edges.filter(e => edgeToRoutes.has(e.id));

    traversedEdges.forEach(edge => {
      const routesUsingEdge = edgeToRoutes.get(edge.id)!;
      const dashes = edge.cost > 100;
      
      routesUsingEdge.forEach((routeIdx) => {
        let color = '#f97316'; 
        if (routeIdx === 1) color = '#3b82f6'; 
        if (routeIdx === 2) color = '#a855f7'; 

        allVisEdges.push({
          id: `${edge.id}-route-${routeIdx}`,
          actualIds: [edge.id],
          from: edge.from,
          to: edge.to,
          isRoute: true,
          label: edge.cost.toString(), 
          font: { color: '#ffffff', size: 12, align: 'horizontal', strokeWidth: 0, strokeColor: 'transparent', face: 'Outfit' }, 
          color: { color, highlight: '#06b6d4', hover: '#fbbf24' },
          width: 4,
          dashes,
          arrows: {
            to: { enabled: true, type: 'vee', scaleFactor: 1.0 }
          }
        });
      });
    });

    const pairGroups = new Map<string, any[]>();
    allVisEdges.forEach(edge => {
       const key = [edge.from, edge.to].sort().join('-');
       if (!pairGroups.has(key)) pairGroups.set(key, []);
       pairGroups.get(key)!.push(edge);
    });

    pairGroups.forEach(edgesInPair => {
       const firstFrom = edgesInPair[0].from;
       const firstTo = edgesInPair[0].to;
       
       let skipsLevel = false;
       activeRoutes.forEach(route => {
           const fromIdx = route.pathNodes.indexOf(firstFrom);
           const toIdx = route.pathNodes.indexOf(firstTo);
           if (fromIdx !== -1 && toIdx !== -1 && toIdx - fromIdx > 1) {
               skipsLevel = true;
           }
       });

       if (edgesInPair.length === 1) {
          edgesInPair[0].smooth = skipsLevel ? { enabled: true, type: 'curvedCW', roundness: 0.4 } : false;
       } else if (edgesInPair.length === 2) {
          edgesInPair[0].smooth = { enabled: true, type: 'curvedCW', roundness: skipsLevel ? 0.4 : 0.15 };
          edgesInPair[1].smooth = { enabled: true, type: 'curvedCCW', roundness: skipsLevel ? 0.4 : 0.15 };
       } else if (edgesInPair.length === 3) {
          edgesInPair[0].smooth = { enabled: true, type: 'curvedCW', roundness: skipsLevel ? 0.5 : 0.2 };
          edgesInPair[1].smooth = skipsLevel ? { enabled: true, type: 'curvedCCW', roundness: 0.3 } : false;
          edgesInPair[2].smooth = { enabled: true, type: 'curvedCCW', roundness: skipsLevel ? 0.5 : 0.2 };
       } else {
          edgesInPair.forEach((edge, idx) => {
             const isEven = idx % 2 === 0;
             const step = Math.floor(idx / 2) + 1;
             edge.smooth = { enabled: true, type: isEven ? 'curvedCW' : 'curvedCCW', roundness: (skipsLevel ? 0.3 : 0.1) * step };
          });
       }
       
       edgesInPair.forEach(edge => {
         if (edge.smooth && edge.smooth.enabled) {
            if (edge.from !== firstFrom) {
                edge.smooth.type = edge.smooth.type === 'curvedCW' ? 'curvedCCW' : 'curvedCW';
            }
         }
       });
    });

    const visNodes = new DataSet(allVisNodes);
    const visEdges = new DataSet(allVisEdges);

    const networkData = {
      nodes: visNodes as any,
      edges: visEdges as any
    };

    const options = {
      layout: {
        hierarchical: {
          enabled: true,
          direction: 'LR',
          sortMethod: 'directed',
          levelSeparation: 250,
          nodeSpacing: 100,
          treeSpacing: 100
        }
      },
      physics: { enabled: false },
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
        color: { highlight: '#06b6d4' }
      }
    };

    const network = new Network(containerRef.current, networkData, options);
    networkRef.current = network;

    const positions = network.getPositions();
    let sumY = 0;
    let count = 0;
    for (const id in positions) {
      sumY += positions[id].y;
      count++;
    }
    const centerY = count > 0 ? sumY / count : 0;
    
    const updates: any[] = [];
    pairGroups.forEach(edgesInPair => {
       if (edgesInPair.length === 1 && edgesInPair[0].smooth && edgesInPair[0].smooth.enabled) {
           const yA = positions[edgesInPair[0].from]?.y || 0;
           const yB = positions[edgesInPair[0].to]?.y || 0;
           const midY = (yA + yB) / 2;
           if (midY > centerY) {
               updates.push({ id: edgesInPair[0].id, smooth: { ...edgesInPair[0].smooth, type: 'curvedCCW' } });
           }
       }
    });

    if (updates.length > 0) {
        visEdges.update(updates);
    }

    const syncEdgeSelectionOnly = () => {
      if (!networkRef.current) return;
      if (selectedEdgesRef.current.length > 0) {
        const visualIdsToSelect = new Set<string>();
        const edgesDs = (networkRef.current as any).body.data.edges;
        edgesDs.forEach((edge: any) => {
          const isSelected = selectedEdgesRef.current.some(id => edge.actualIds?.includes(id));
          if (isSelected) {
            visualIdsToSelect.add(edge.id);
          }
        });
        networkRef.current.setSelection({ nodes: [], edges: Array.from(visualIdsToSelect) });
      } else {
        networkRef.current.unselectAll();
      }
    };

    network.on('selectNode', () => {
      syncEdgeSelectionOnly();
    });

    network.on('hoverNode', (params) => {
      const node = visNodes.get(params.node) as any;
      if (node && node.originalNodeId) {
        onHoverElement({ type: 'node', id: node.originalNodeId });
      }
    });
    
    network.on('blurNode', () => onHoverElement(null));
    
    network.on('hoverEdge', (params) => {
      const edge = visEdges.get(params.edge) as any;
      if (edge && edge.actualIds && edge.actualIds.length > 0) {
        onHoverElement({ type: 'edge', id: edge.actualIds[0] });
      }
    });
    
    network.on('blurEdge', () => onHoverElement(null));

    network.on('click', (params) => {
      if (params.nodes && params.nodes.length > 0) {
        syncEdgeSelectionOnly();
        return;
      }
      if (params.edges && params.edges.length > 0) {
        if (onSelectionChange) {
          const selectedOriginalIds: string[] = [];
          params.edges.forEach((visualId: string) => {
            const edgeData = visEdges.get(visualId) as any;
            if (edgeData && edgeData.actualIds) {
              selectedOriginalIds.push(...edgeData.actualIds);
            }
          });
          onSelectionChange(selectedOriginalIds, true);
        }
      } else {
        if (onSelectionChange) {
          onSelectionChange([], false);
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
  }, [data, routes, selectedRouteIndices, sourceId, destId]);

  useEffect(() => {
    if (networkRef.current) {
      const edgesDs = (networkRef.current as any).body.data.edges;
      const nodesDs = (networkRef.current as any).body.data.nodes;

      const clearUpdates: any[] = [];
      edgesDs.forEach((edge: any) => {
        if (edge.originalHoverColor) {
          clearUpdates.push({ id: edge.id, color: edge.originalHoverColor, originalHoverColor: null });
        }
      });
      if (clearUpdates.length > 0) {
        edgesDs.update(clearUpdates);
      }

      if (hoveredElement && hoveredElement.type === 'edge') {
        const matchingEdges: any[] = [];
        edgesDs.forEach((edge: any) => {
          if (edge.actualIds && edge.actualIds.includes(hoveredElement.id)) {
            matchingEdges.push(edge);
          }
        });
        
        matchingEdges.forEach(edge => {
          edgesDs.update({
            id: edge.id,
            originalHoverColor: edge.color,
            color: { ...edge.color, color: '#f97316' }
          });
        });
      }

      if (hoveredElement && hoveredElement.type === 'node') {
        const visualIdsToSelect: string[] = [];
        nodesDs.forEach((node: any) => {
          if (node.originalNodeId === hoveredElement.id) {
            visualIdsToSelect.push(node.id);
          }
        });
        networkRef.current.setSelection({ nodes: visualIdsToSelect, edges: [] }, { highlightEdges: false });
        return;
      }

      if (selectedEdges.length === 0) {
        networkRef.current.unselectAll();
      } else {
        const visualIdsToSelect = new Set<string>();
        edgesDs.forEach((edge: any) => {
          const isSelected = selectedEdges.some(id => edge.actualIds?.includes(id));
          if (isSelected) {
            visualIdsToSelect.add(edge.id);
          }
        });
        networkRef.current.setSelection({ nodes: [], edges: Array.from(visualIdsToSelect) });
      }
    }
  }, [selectedEdges, hoveredElement]);

  const minHops = Math.min(...routes.map(r => r.pathEdges.length));

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
      <div style={{
        padding: '8px 16px',
        background: 'rgba(24, 24, 27, 0.95)',
        borderBottom: '1px solid var(--border)',
        display: 'flex',
        justifyContent: dir === 'rtl' ? 'flex-start' : 'space-between',
        gap: dir === 'rtl' ? '32px' : '0',
        alignItems: 'center',
        flexShrink: 0,
        zIndex: 5
      }} dir={dir}>
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
                {t('isolated.totalCost')}
              </span>
              <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#10b981', lineHeight: 1 }}>
                {routes[0].totalCost.toFixed(2)}
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
                {t('isolated.minHops')}
              </span>
              <span style={{ fontSize: '1.15rem', fontWeight: 800, color: '#60a5fa', lineHeight: 1 }}>
                {minHops} <span style={{ fontSize: '0.75rem', fontWeight: 500, color: 'var(--text-secondary)' }}>{t('isolated.hopsCount')}</span>
              </span>
            </div>
          </div>
        </div>
      </div>

      <div style={{ flex: 1, position: 'relative', width: '100%', minHeight: 0 }}>
        <div
          ref={containerRef}
          style={{ width: '100%', height: '100%', position: 'absolute', top: 0, left: 0 }}
        />
        
        {totalRoutes > 1 && (
          <div style={{ position: 'absolute', top: 16, left: 16, zIndex: 20 }} ref={dropdownRef}>
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
              {t('isolated.showing')} {selectedRouteIndices.length} {t('isolated.of')} {totalRoutes} {t('isolated.optimalRoutes')} ▾
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
                width: '200px',
                boxShadow: '0 4px 12px rgba(0,0,0,0.5)',
                maxHeight: '160px',
                overflowY: 'auto',
                boxSizing: 'border-box'
              }}>
                {routes.map((route, idx) => {
                  const isChecked = selectedRouteIndices.includes(idx);
                  const isDisabled = !isChecked && selectedRouteIndices.length >= 3;
                  return (
                    <label key={idx} style={{ 
                      display: 'flex', alignItems: 'center', gap: '8px', 
                      cursor: isDisabled ? 'not-allowed' : 'pointer', 
                      opacity: isDisabled ? 0.4 : 1, 
                      fontSize: '0.75rem',
                      color: 'var(--text-primary)',
                      fontFamily: 'inherit'
                    }}>
                      <input 
                        type="checkbox" 
                        checked={isChecked} 
                        disabled={isDisabled}
                        onChange={() => {
                          if (isChecked) {
                            onSelectedRoutesChange?.(selectedRouteIndices.filter(i => i !== idx));
                          } else if (!isDisabled) {
                            onSelectedRoutesChange?.([...selectedRouteIndices, idx].sort((a,b) => a - b));
                          }
                        }}
                      />
                      {t('isolated.route')} {idx + 1} ({route.pathEdges.length} {t('isolated.hopsCount')})
                    </label>
                  );
                })}
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default IsolatedRouteViewer;
