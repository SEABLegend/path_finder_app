import React, { useState } from 'react';
import { Upload, GitGraph, FilePlus, AlertTriangle } from 'lucide-react';
import { parseCsvToGraph } from './engine/CsvParser';
import type { ParsedGraphData, ColumnMapping, GraphEdge } from './engine/CsvParser';
import { calculateShortestPath } from './engine/Pathfinding';
import type { RouteResult } from './engine/Pathfinding';
import ColumnMapper from './components/ColumnMapper';
import MapViewer from './components/MapViewer';
import IsolatedRouteViewer from './components/IsolatedRouteViewer';
import SidePanel from './components/SidePanel';
import DiffLogModal from './components/DiffLogModal';
import './App.css';

function App() {
  const [graphData, setGraphData] = useState<ParsedGraphData | null>(null);
  const [graphDataB, setGraphDataB] = useState<ParsedGraphData | null>(null);
  
  const [isParsing, setIsParsing] = useState(false);
  const [pendingFile, setPendingFile] = useState<{ file: File, isMapB: boolean } | null>(null);
  const [showMapper, setShowMapper] = useState(false);
  const [showDiff, setShowDiff] = useState(false);
  
  const [currentRoute, setCurrentRoute] = useState<RouteResult | null>(null);
  const [currentRouteB, setCurrentRouteB] = useState<RouteResult | null>(null);
  
  const [cancelledEdges, setCancelledEdges] = useState<Set<string>>(new Set());
  const [hoveredElement, setHoveredElement] = useState<{ type: 'node' | 'edge'; id: string } | null>(null);

  // Store original search nodes to trigger recalculation on cancellation
  const [searchState, setSearchState] = useState<{source: string, dest: string} | null>(null);

  // Undo History: storing past 10 states of graphData.edges and cancelledEdges
  const [history, setHistory] = useState<{ edges: GraphEdge[], cancelledEdges: Set<string> }[]>([]);

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
  };

  const handleUndo = () => {
    if (history.length === 0 || !graphData) return;
    const lastState = history[history.length - 1];
    setHistory(prev => prev.slice(0, prev.length - 1));
    
    setGraphData({ ...graphData, edges: lastState.edges });
    setCancelledEdges(lastState.cancelledEdges);

    if (searchState) {
      setTimeout(() => {
        handleCalculateRoute(searchState.source, searchState.dest, lastState.cancelledEdges, lastState.edges);
      }, 0);
    }
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>, isMapB: boolean = false) => {
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
             const resultB = calculateShortestPath(data.nodes, data.edges, searchState.source, searchState.dest, new Set());
             setCurrentRouteB(resultB);
          }
        } else {
          setGraphData(data);
          setGraphDataB(null); // Reset B if A changes
          setCurrentRoute(null);
          setCurrentRouteB(null);
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
    const result = calculateShortestPath(
      graphData.nodes, 
      customEdges, 
      sourceId, 
      destId,
      customCancelled
    );
    
    setSearchState({ source: sourceId, dest: destId });
    
    if (result) {
      setCurrentRoute(result);
    } else {
      alert("No valid route found between these nodes under current constraints.");
      setCurrentRoute(null);
    }

    // Also calculate for Map B if it exists
    if (graphDataB) {
      const resultB = calculateShortestPath(
        graphDataB.nodes, 
        graphDataB.edges, 
        sourceId, 
        destId,
        new Set() // Map B doesn't share cancelled edges for now
      );
      setCurrentRouteB(resultB);
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
          
          <div className="file-input-wrapper">
            <button className="btn" disabled={!graphData || (isParsing && pendingFile?.isMapB)}>
              <FilePlus size={16} />
              Compare Map (A/B)
            </button>
            {graphData && (
              <input 
                type="file" 
                accept=".csv" 
                onChange={e => handleFileUpload(e, true)} 
                disabled={isParsing || showMapper}
              />
            )}
          </div>
        </div>
      </header>

      {/* Main Workspace */}
      <main className="main-content">
        
        {/* Left Map Area - Now potentially split */}
        <section className="map-container" id="main-map-canvas" style={{ display: 'flex', flexDirection: 'column' }}>
          
          <div style={{ flex: searchState ? 2 : 1, position: 'relative' }}>
            {graphData ? (
              <MapViewer 
                data={graphData} 
                routeNodes={currentRoute?.pathNodes} 
                routeEdges={currentRoute?.pathEdges}
                cancelledEdges={cancelledEdges}
                hoveredElement={hoveredElement}
                onHoverElement={handleHoverElement}
                selectedEdges={selectedEdges}
                onSelectionChange={handleSelectionToggle}
              />
            ) : (
              <div className="empty-state">
                <GitGraph size={64} opacity={0.2} />
                <p>No map loaded. Please import a CSV file to begin.</p>
              </div>
            )}
          </div>

          {searchState && graphData && (
            <div style={{ flex: 1, position: 'relative', display: 'flex' }}>
              <div style={{ flex: 1, position: 'relative', borderRight: graphDataB ? '1px solid var(--border)' : 'none' }}>
                {currentRoute ? (
                  <IsolatedRouteViewer 
                    data={graphData}
                    route={currentRoute}
                    hoveredElement={hoveredElement}
                    onHoverElement={handleHoverElement}
                    selectedEdges={selectedEdges}
                    onSelectionChange={handleSelectionToggle}
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
                  {currentRouteB ? (
                    <IsolatedRouteViewer 
                      data={graphDataB}
                      route={currentRouteB}
                      title="Map B Route View"
                      onHoverElement={() => {}} 
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
          onUndo={handleUndo}
          canUndo={history.length > 0}
          onDeleteManualEdge={handleDeleteManualEdge}
          onEditManualEdge={handleEditManualEdge}
          selectedEdges={selectedEdges}
          onCancelSelectedEdges={handleCancelSelectedEdges}
          onManualCancel={handleManualCancel}
        />
      </main>
    </div>
  );
}

export default App;
