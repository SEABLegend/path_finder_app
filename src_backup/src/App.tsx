import React, { useState } from 'react';
import { Upload, GitGraph, AlertTriangle, Undo2, Redo2, XCircle, Plus } from 'lucide-react';
import { parseCsvToGraph } from './engine/CsvParser';
import type { ParsedGraphData, ColumnMapping, GraphEdge } from './engine/CsvParser';
import { calculateShortestPaths } from './engine/Pathfinding';
import type { RouteResult } from './engine/Pathfinding';
import ColumnMapper from './components/ColumnMapper';
import MapViewer from './components/MapViewer';
import IsolatedRouteViewer from './components/IsolatedRouteViewer';
import SidePanel from './components/SidePanel';
import DiffLogModal from './components/DiffLogModal';
import './App.css';

function App() {
  const [baseGraphData, setBaseGraphData] = useState<ParsedGraphData | null>(null);
  const [graphData, setGraphData] = useState<ParsedGraphData | null>(null);
  const [graphDataB, setGraphDataB] = useState<ParsedGraphData | null>(null);
  
  const [isParsing, setIsParsing] = useState(false);
  const [pendingFile, setPendingFile] = useState<{ file: File, isMapB: boolean } | null>(null);
  const [showMapper, setShowMapper] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  
  const [currentRoutes, setCurrentRoutes] = useState<RouteResult[]>([]);
  const [currentRoutesB, setCurrentRoutesB] = useState<RouteResult[]>([]);
  const [selectedRouteIndices, setSelectedRouteIndices] = useState<number[]>([]);
  const [selectedRouteIndicesB, setSelectedRouteIndicesB] = useState<number[]>([]);
  const [mainRouteIndex, setMainRouteIndex] = useState<number>(0);
  
  const [cancelledEdges, setCancelledEdges] = useState<Set<string>>(new Set());
  const [hoveredElement, setHoveredElement] = useState<{ type: 'node' | 'edge'; id: string } | null>(null);

  const [searchState, setSearchState] = useState<{source: string, dest: string} | null>(null);

  const [history, setHistory] = useState<{ edges: GraphEdge[], cancelledEdges: Set<string> }[]>([]);
  const [redoHistory, setRedoHistory] = useState<{ edges: GraphEdge[], cancelledEdges: Set<string> }[]>([]);

  const [tabs, setTabs] = useState<{id: number, title: string}[]>([{ id: 1, title: '1' }]);
  const [activeTabId, setActiveTabId] = useState<number>(1);
  const [nextTabId, setNextTabId] = useState<number>(2);
  const [showTabMenu, setShowTabMenu] = useState<boolean>(false);
  const tabStates = React.useRef<Record<number, any>>({});

  React.useEffect(() => {
    tabStates.current[activeTabId] = {
      graphData, currentRoutes, cancelledEdges, searchState, history, redoHistory, selectedRouteIndices, mainRouteIndex
    };
  }, [graphData, currentRoutes, cancelledEdges, searchState, history, redoHistory, selectedRouteIndices, mainRouteIndex, activeTabId]);

  const handleTabSwitch = (id: number) => {
    const state = tabStates.current[id];
    if (state) {
      setActiveTabId(id);
      setGraphData(state.graphData);
      setCurrentRoutes(state.currentRoutes);
      setCancelledEdges(state.cancelledEdges);
      setSearchState(state.searchState);
      setHistory(state.history);
      setRedoHistory(state.redoHistory);
      setSelectedRouteIndices(state.selectedRouteIndices || []);
      setMainRouteIndex(state.mainRouteIndex || 0);
    }
  };

  const handleAddTab = (duplicateState: boolean) => {
    if (tabs.length >= 6 || !baseGraphData) return;
    const newId = nextTabId;
    setNextTabId(newId + 1);
    setTabs(prev => [...prev, { id: newId, title: newId.toString() }]);
    
    setActiveTabId(newId);
    if (duplicateState && graphData) {
      setGraphData(graphData);
      setCancelledEdges(new Set(cancelledEdges));
    } else {
      setGraphData(baseGraphData);
      setCancelledEdges(new Set());
    }
    setCurrentRoutes([]);
    setSelectedRouteIndices([]);
    setMainRouteIndex(0);
    setSearchState(null);
    setHistory([]);
    setRedoHistory([]);
    setShowTabMenu(false);
  };

  const handleDeleteTab = (id: number, e: React.MouseEvent) => {
    e.stopPropagation();
    if (tabs.length === 1) return; 
    setTabs(prev => prev.filter(t => t.id !== id));
    delete tabStates.current[id];
    
    if (activeTabId === id) {
      const remainingTabs = tabs.filter(t => t.id !== id);
      handleTabSwitch(remainingTabs[0].id);
    }
  };

  const [mapping, setMapping] = useState<ColumnMapping>({
    sourceCol: 0,
    destCol: 1,
    costCol: 4
  });

  const [csvHeaders, setCsvHeaders] = useState<string[]>([]);
  const [selectedEdges, setSelectedEdges] = useState<string[]>([]);

  const handleSelectionToggle = (edgeIds: string[], replace: boolean = false) => {
    if (replace) {
      setSelectedEdges(edgeIds);
    } else {
      setSelectedEdges(prev => {
        const next = new Set(prev);
        const allPresent = edgeIds.length > 0 && edgeIds.every(id => next.has(id));
        if (allPresent) {
          edgeIds.forEach(id => next.delete(id));
        } else {
          edgeIds.forEach(id => next.add(id));
        }
        return Array.from(next);
      });
    }
  };

  const handleHoverElement = (element: { type: 'node' | 'edge'; id: string } | null) => {
    setHoveredElement(prev => {
      if (prev === null && element === null) return null;
      if (prev && element && prev.type === element.type && prev.id === element.id) return prev;
      return element;
    });
  };

  const pushToHistory = () => {
    if (!graphData) return;
    setHistory(prev => {
      const newHistory = [...prev, { edges: [...graphData.edges], cancelledEdges: new Set(cancelledEdges) }];
      if (newHistory.length > 10) newHistory.shift();
      return newHistory;
    });
    setRedoHistory([]); // Clear redo history when a new action happens
  };

  const handleUndo = () => {
    if (history.length === 0 || !graphData) return;
    const lastState = history[history.length - 1];
    setHistory(prev => prev.slice(0, prev.length - 1));
    setRedoHistory(prev => [...prev, { edges: [...graphData.edges], cancelledEdges: new Set(cancelledEdges) }]);
    
    setGraphData({ ...graphData, edges: lastState.edges });
    setCancelledEdges(lastState.cancelledEdges);

    if (searchState) {
      setTimeout(() => {
        handleCalculateRoute(searchState.source, searchState.dest, lastState.cancelledEdges, lastState.edges);
      }, 0);
    }
  };

  const handleRedo = () => {
    if (redoHistory.length === 0 || !graphData) return;
    const nextState = redoHistory[redoHistory.length - 1];
    setRedoHistory(prev => prev.slice(0, prev.length - 1));
    setHistory(prev => [...prev, { edges: [...graphData.edges], cancelledEdges: new Set(cancelledEdges) }]);
    
    setGraphData({ ...graphData, edges: nextState.edges });
    setCancelledEdges(nextState.cancelledEdges);

    if (searchState) {
      setTimeout(() => {
        handleCalculateRoute(searchState.source, searchState.dest, nextState.cancelledEdges, nextState.edges);
      }, 0);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isMapB: boolean = false) => {
    if (!isMapB && tabs.length > 1) {
       const ok = window.confirm("Warning: Importing new data will close all currently open tabs. Do you want to proceed?");
       if (!ok) {
         e.preventDefault();
         return;
       }
    }
    const file = e.target.files?.[0];
    if (!file) return;
    
    // Quick preview to extract headers
    const reader = new FileReader();
    reader.onload = (event) => {
      const text = event.target?.result as string;
      const firstLine = text.split('\n')[0];
      const headers = firstLine.split(',').map(h => h.trim());
      setCsvHeaders(headers);
      
      setPendingFile({ file, isMapB });
      setShowMapper(true);
    };
    reader.readAsText(file.slice(0, 1024));
    
    e.target.value = '';
  };

  const processCsv = (currentMapping: ColumnMapping) => {
    if (!pendingFile) return;
    
    setMapping(currentMapping);
    setShowMapper(false);
    setIsParsing(true);
    
    parseCsvToGraph(
      pendingFile.file,
      currentMapping,
      (data) => {
        if (pendingFile.isMapB) {
          setGraphDataB(data);
          setShowDiff(true);
          // If we already had a search state, calculate route for B immediately
          if (searchState) {
             const resultsB = calculateShortestPaths(data.nodes, data.edges, searchState.source, searchState.dest, new Set());
             setCurrentRoutesB(resultsB);
             setSelectedRouteIndicesB([0, 1, 2].slice(0, resultsB.length));
          }
        } else {
          setBaseGraphData(data);
          setGraphData(data);
          setTabs([{ id: 1, title: '1' }]);
          setActiveTabId(1);
          setNextTabId(2);
          tabStates.current = {};
          setGraphDataB(null); // Reset B if A changes
          setCurrentRoutes([]);
          setCurrentRoutesB([]);
          setCancelledEdges(new Set());
          setSearchState(null);
          setHistory([]);
        }
        setIsParsing(false);
        setPendingFile(null);
      },
      (error) => {
        console.error("Failed to parse CSV:", error);
        setIsParsing(false);
        setPendingFile(null);
        alert(`CSV Import Notice: ${error.message}`);
      }
    );
  };

  const handleCalculateRoute = (sourceId: string, destId: string, customCancelled = cancelledEdges, customEdges = graphData?.edges) => {
    if (!graphData || !customEdges) return;
    const results = calculateShortestPaths(
      graphData.nodes, 
      customEdges, 
      sourceId, 
      destId,
      customCancelled
    );
    
    setSearchState({ source: sourceId, dest: destId });
    
    if (results.length > 0) {
      setCurrentRoutes(results);
      setSelectedRouteIndices([0, 1, 2].slice(0, results.length));
      setMainRouteIndex(0);
      const srcNode = graphData.nodes.find(n => n.id === sourceId);
      const dstNode = graphData.nodes.find(n => n.id === destId);
      const srcName = (srcNode?.title || srcNode?.id || sourceId).split(' ')[0].substring(0, 8);
      const dstName = (dstNode?.title || dstNode?.id || destId).split(' ')[0].substring(0, 8);
      setTabs(prev => prev.map(t => t.id === activeTabId ? { ...t, title: `${srcName} -> ${dstName}` } : t));
    } else {
      alert("No valid route found between these nodes under current constraints.");
      setCurrentRoutes([]);
      setSelectedRouteIndices([]);
      setMainRouteIndex(0);
    }

    if (graphDataB) {
      const resultsB = calculateShortestPaths(
        graphDataB.nodes, 
        graphDataB.edges, 
        sourceId, 
        destId,
        new Set()
      );
      setCurrentRoutesB(resultsB);
      setSelectedRouteIndicesB([0, 1, 2].slice(0, resultsB.length));
    }
  };

  // handleCancelEdge removed as we now use selection-based multi-cancel

  const handleCancelSelectedEdges = () => {
    if (selectedEdges.length === 0) return;
    pushToHistory();
    const newCancelled = new Set(cancelledEdges);
    selectedEdges.forEach(id => newCancelled.add(id));
    setCancelledEdges(newCancelled);
    setSelectedEdges([]); // Clear selection after cancel

    if (searchState) {
      handleCalculateRoute(searchState.source, searchState.dest, newCancelled);
    }
  };

  const handleManualCancel = (from: string, to: string) => {
    if (!graphData) return;
    // Find edge that matches from and to
    // They might have selected reverse order or manual edge
    const matchingEdges = graphData.edges.filter(e => 
      (e.from === from && e.to === to) || (e.from === to && e.to === from)
    );
    if (matchingEdges.length === 0) {
      alert("No edge found between those nodes.");
      return;
    }
    
    pushToHistory();
    const newCancelled = new Set(cancelledEdges);
    matchingEdges.forEach(e => newCancelled.add(e.id));
    setCancelledEdges(newCancelled);

    if (searchState) {
      handleCalculateRoute(searchState.source, searchState.dest, newCancelled);
    }
  };

  const handleUncancelEdge = (edgeId: string) => {
    if (!graphData) return;
    pushToHistory();
    const newCancelled = new Set(cancelledEdges);
    
    // Find the edge being uncancelled
    const edge = graphData.edges.find(e => e.id === edgeId);
    if (edge) {
      // Find all symmetric edges
      const symmetricEdges = graphData.edges.filter(e => 
        (e.from === edge.from && e.to === edge.to) || (e.from === edge.to && e.to === edge.from)
      );
      symmetricEdges.forEach(e => newCancelled.delete(e.id));
    } else {
      newCancelled.delete(edgeId);
    }

    setCancelledEdges(newCancelled);

    if (searchState) {
      handleCalculateRoute(searchState.source, searchState.dest, newCancelled);
    }
  };

  const handleAddManualEdge = (from: string, to: string, cost: number) => {
    if (!graphData) return;
    pushToHistory();

    const newEdge: GraphEdge = {
      id: `manual_${Date.now()}`,
      from,
      to,
      cost
    };

    const newEdges = [...graphData.edges, newEdge];
    setGraphData({ ...graphData, edges: newEdges });

    if (searchState) {
      handleCalculateRoute(searchState.source, searchState.dest, cancelledEdges, newEdges);
    }
  };

  const handleDeleteManualEdge = (edgeId: string) => {
    if (!graphData) return;
    pushToHistory();
    const newEdges = graphData.edges.filter(e => e.id !== edgeId);
    setGraphData({ ...graphData, edges: newEdges });
    if (searchState) {
      handleCalculateRoute(searchState.source, searchState.dest, cancelledEdges, newEdges);
    }
  };

  const handleEditManualEdge = (edgeId: string, newCost: number) => {
    if (!graphData) return;
    pushToHistory();
    const newEdges = graphData.edges.map(e => e.id === edgeId ? { ...e, cost: newCost } : e);
    setGraphData({ ...graphData, edges: newEdges });
    if (searchState) {
      handleCalculateRoute(searchState.source, searchState.dest, cancelledEdges, newEdges);
    }
  };

  const [mapHeightPercent, setMapHeightPercent] = useState<number>(60);
  const isDragging = React.useRef(false);
  const containerRef = React.useRef<HTMLElement>(null);

  React.useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      if (!isDragging.current || !containerRef.current) return;
      const rect = containerRef.current.getBoundingClientRect();
      let percent = ((e.clientY - rect.top) / rect.height) * 100;
      if (percent < 20) percent = 20;
      if (percent > 80) percent = 80;
      setMapHeightPercent(percent);
    };
    const handleMouseUp = () => {
      if (isDragging.current) {
        isDragging.current = false;
        document.body.style.cursor = 'default';
        document.body.style.userSelect = 'auto';
      }
    };
    document.addEventListener('mousemove', handleMouseMove);
    document.addEventListener('mouseup', handleMouseUp);
    return () => {
      document.removeEventListener('mousemove', handleMouseMove);
      document.removeEventListener('mouseup', handleMouseUp);
    };
  }, []);

  const startDrag = () => {
    isDragging.current = true;
    document.body.style.cursor = 'ns-resize';
    document.body.style.userSelect = 'none';
  };

  return (
    <div className="app-container">
      {showMapper && pendingFile && (
        <ColumnMapper
          initialMapping={mapping}
          headers={csvHeaders}
          onConfirm={processCsv}
          onCancel={() => {
            setShowMapper(false);
            setPendingFile(null);
          }}
        />
      )}

      {showDiff && graphData && graphDataB && (
        <DiffLogModal 
          edgesA={graphData.edges}
          edgesB={graphDataB.edges}
          onClose={() => setShowDiff(false)}
        />
      )}

      {/* Top Navigation Bar */}
      <header className="top-bar">
        <div className="brand">
          <GitGraph className="brand-icon" size={24} />
          PathFinder Pro
        </div>
        
        <div className="controls">
          <div style={{ display: 'flex', gap: '8px', marginRight: '16px', alignItems: 'center' }}>
            <button 
              className="icon-btn" 
              onClick={handleUndo} 
              disabled={history.length === 0} 
              title="Undo"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
            >
              <Undo2 size={16} style={{ opacity: history.length > 0 ? 1 : 0.3 }} />
            </button>
            <button 
              className="icon-btn" 
              onClick={handleRedo} 
              disabled={redoHistory.length === 0} 
              title="Redo"
              style={{ background: 'var(--bg-secondary)', border: '1px solid var(--border)' }}
            >
              <Redo2 size={16} style={{ opacity: redoHistory.length > 0 ? 1 : 0.3 }} />
            </button>
          </div>

          <div className="file-input-wrapper">
            <button className="btn btn-primary">
              <Upload size={16} />
              {isParsing && pendingFile?.isMapB === false ? 'Loading...' : 'Import CSV Map'}
            </button>
            <input 
              type="file" 
              accept=".csv" 
              onChange={e => handleFileUpload(e, false)} 
              disabled={isParsing || showMapper}
            />
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="main-content">
        
        {/* Left Map Area - Now potentially split */}
        <section className="map-container" ref={containerRef} id="main-map-canvas" style={{ display: 'flex', flexDirection: 'column' }}>
          
          <div style={{ flex: searchState ? `0 0 ${mapHeightPercent}%` : 1, position: 'relative', minHeight: 0 }}>
            {graphData ? (
              <MapViewer 
                data={graphData} 
                routeNodes={currentRoutes[mainRouteIndex]?.pathNodes || []} 
                routeEdges={currentRoutes[mainRouteIndex]?.pathEdges || []}
                cancelledEdges={cancelledEdges}
                hoveredElement={hoveredElement}
                onHoverElement={handleHoverElement}
                selectedEdges={selectedEdges}
                onSelectionChange={handleSelectionToggle}
                sourceId={searchState?.source}
                destId={searchState?.dest}
                totalRoutes={currentRoutes.length}
                mainRouteIndex={mainRouteIndex}
                onMainRouteIndexChange={setMainRouteIndex}
              />
            ) : (
              <div className="empty-state">
                <GitGraph size={64} opacity={0.2} />
                <p>No map loaded. Please import a CSV file to begin.</p>
              </div>
            )}
          </div>

          {searchState && (
            <div 
              onMouseDown={startDrag}
              style={{
                height: '4px',
                cursor: 'ns-resize',
                backgroundColor: 'var(--border)',
                zIndex: 10
              }}
            />
          )}

          {baseGraphData && (
             <div className="tabs-ribbon" style={{ display: 'flex', flexDirection: 'row-reverse', justifyContent: 'flex-start', gap: '4px', padding: '6px 12px', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)', borderBottom: '1px solid var(--border)', overflow: 'visible', flexWrap: 'wrap', minHeight: '36px', alignItems: 'center', zIndex: 20 }}>
                {tabs.map(tab => (
                   <div key={tab.id} onClick={() => handleTabSwitch(tab.id)} style={{ padding: '4px 12px', background: activeTabId === tab.id ? 'var(--bg-elevated)' : 'transparent', border: '1px solid var(--border)', borderRadius: '6px', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: '8px', fontSize: '0.875rem', fontWeight: activeTabId === tab.id ? 600 : 400, color: activeTabId === tab.id ? 'var(--text-primary)' : 'var(--text-secondary)' }}>
                      {tab.title}
                      {tabs.length > 1 && (
                        <div onClick={(e) => handleDeleteTab(tab.id, e)} style={{ display: 'flex', alignItems: 'center', color: 'var(--text-secondary)', padding: '2px', borderRadius: '50%', background: 'rgba(255,255,255,0.05)' }}>
                           <XCircle size={14} />
                        </div>
                      )}
                   </div>
                ))}
                {tabs.length < 6 && (
                   <div style={{ position: 'relative' }}>
                     <button 
                       className="icon-btn" 
                       onClick={() => {
                         const manualCount = graphData ? graphData.edges.filter(e => e.id.startsWith('manual_')).length : 0;
                         if (cancelledEdges.size === 0 && manualCount === 0) {
                           handleAddTab(false);
                         } else {
                           setShowTabMenu(!showTabMenu);
                         }
                       }}
                       title="New Tab" 
                       style={{ marginLeft: '8px', background: 'var(--bg-elevated)', border: '1px solid var(--border)' }}
                     >
                       <Plus size={16} />
                     </button>
                     {showTabMenu && (
                       <div style={{
                         position: 'absolute',
                         bottom: '100%',
                         left: '50%',
                         transform: 'translateX(-50%)',
                         marginBottom: '8px',
                         background: 'var(--bg-elevated)',
                         border: '1px solid var(--border)',
                         borderRadius: '8px',
                         padding: '6px',
                         zIndex: 9999,
                         boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5), 0 8px 10px -6px rgba(0, 0, 0, 0.5)',
                         display: 'flex',
                         flexDirection: 'column',
                         whiteSpace: 'nowrap'
                       }}>
                         <div style={{
                           position: 'absolute',
                           bottom: '-6px',
                           left: '50%',
                           transform: 'translateX(-50%) rotate(45deg)',
                           width: '10px',
                           height: '10px',
                           background: 'var(--bg-elevated)',
                           borderBottom: '1px solid var(--border)',
                           borderRight: '1px solid var(--border)',
                           zIndex: 0
                         }} />
                         <button 
                           onClick={() => handleAddTab(false)}
                           style={{ position: 'relative', zIndex: 1, padding: '8px 12px', textAlign: 'left', background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', borderRadius: '4px', fontSize: '0.875rem' }}
                           onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                           onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                         >
                           New Tab (Clear State)
                         </button>
                         <button 
                           onClick={() => handleAddTab(true)}
                           style={{ position: 'relative', zIndex: 1, marginTop: '4px', padding: '8px 12px', textAlign: 'left', background: 'transparent', border: 'none', color: 'var(--text-primary)', cursor: 'pointer', borderRadius: '4px', fontSize: '0.875rem' }}
                           onMouseEnter={e => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
                           onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                         >
                           New Tab (Duplicate Edits)
                         </button>
                       </div>
                     )}
                   </div>
                )}
             </div>
          )}

          {searchState && graphData && (
            <div style={{ flex: 1, position: 'relative', display: 'flex' }}>
              <div style={{ flex: 1, position: 'relative', borderRight: graphDataB ? '1px solid var(--border)' : 'none' }}>
                {currentRoutes.length > 0 ? (
                  <IsolatedRouteViewer 
                    data={graphData}
                    routes={currentRoutes}
                    totalRoutes={currentRoutes.length}
                    selectedRouteIndices={selectedRouteIndices}
                    onSelectedRoutesChange={setSelectedRouteIndices}
                    hoveredElement={hoveredElement}
                    onHoverElement={handleHoverElement}
                    selectedEdges={selectedEdges}
                    onSelectionChange={handleSelectionToggle}
                    sourceId={searchState?.source}
                    destId={searchState?.dest}
                  />
                ) : (
                  <div className="empty-state" style={{ height: '100%', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)' }}>
                    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#ef4444' }}>
                      <AlertTriangle size={48} style={{ opacity: 0.5, marginBottom: '16px' }} />
                      <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>No Path Found</h3>
                      <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>There is no valid directional path between the selected nodes.</p>
                    </div>
                  </div>
                )}
              </div>

              {graphDataB && (
                <div style={{ flex: 1, position: 'relative' }}>
                  {currentRoutesB.length > 0 ? (
                    <IsolatedRouteViewer 
                      data={graphDataB}
                      routes={currentRoutesB}
                      totalRoutes={currentRoutesB.length}
                      selectedRouteIndices={selectedRouteIndicesB}
                      onSelectedRoutesChange={setSelectedRouteIndicesB}
                      title="Map B Route View"
                      onHoverElement={() => {}} 
                      sourceId={searchState?.source}
                      destId={searchState?.dest}
                    />
                  ) : (
                    <div className="empty-state" style={{ height: '100%', background: 'var(--bg-secondary)', borderTop: '1px solid var(--border)' }}>
                      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', color: '#ef4444' }}>
                        <AlertTriangle size={48} style={{ opacity: 0.5, marginBottom: '16px' }} />
                        <h3 style={{ fontSize: '1.25rem', marginBottom: '8px' }}>No Path Found in Map B</h3>
                        <p style={{ color: 'var(--text-secondary)', textAlign: 'center' }}>There is no valid directional path in Map B.</p>
                      </div>
                    </div>
                  )}
                </div>
              )}
            </div>
          )}

        </section>

        {/* Right Side Panel */}
        <SidePanel 
          nodes={graphData?.nodes || []}
          edges={graphData?.edges || []}
          cancelledEdges={cancelledEdges}
          onCalculateRoute={(src, dst) => handleCalculateRoute(src, dst)}
          onUncancelEdge={handleUncancelEdge}
          onAddManualEdge={handleAddManualEdge}
          onDeleteManualEdge={handleDeleteManualEdge}
          onEditManualEdge={handleEditManualEdge}
          selectedEdges={selectedEdges}
          onCancelSelectedEdges={handleCancelSelectedEdges}
          onManualCancel={handleManualCancel}
          routesCount={currentRoutes.length}
          onCompareUpload={e => handleFileUpload(e, true)}
          isParsing={isParsing}
        />
      </main>
    </div>
  );
}

export default App;
