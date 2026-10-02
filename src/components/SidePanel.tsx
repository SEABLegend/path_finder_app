import React, { useState, useEffect, useRef } from 'react';

import type { GraphNode, GraphEdge } from '../engine/CsvParser';
import { Route, MapPin, Navigation, Plus, XCircle, RotateCcw, Edit2, Trash2, FilePlus } from 'lucide-react';
import { InfoTooltip } from './InfoTooltip';
import { useI18n } from '../i18n';

interface SidePanelProps {
  nodes: GraphNode[];
  edges: GraphEdge[];
  edgesB?: GraphEdge[];
  cancelledEdges: Set<string>;
  cancelledEdgesB?: Set<string>;
  onCalculateRoute: (sourceId: string, destId: string) => void;
  onUncancelEdge: (edgeIds: string[]) => void;
  onAddManualEdge: (from: string, to: string, cost: number) => void;
  onDeleteManualEdge?: (edgeId: string) => void;
  onEditManualEdge?: (edgeId: string, newCost: number) => void;
  selectedEdges?: string[];
  onCancelSelectedEdges?: () => void;
  onManualCancel?: (from: string, to: string) => void;
  routesCount?: number;
  onCompareUpload?: (e: React.ChangeEvent<HTMLInputElement>) => void;
  isParsing?: boolean;
  showComparedMap?: boolean;
  pathTarget?: 'A' | 'B';
  onPathTargetChange?: (target: 'A' | 'B') => void;
  ledgerTarget?: 'A' | 'B' | 'Both';
  onLedgerTargetChange?: (target: 'A' | 'B' | 'Both') => void;
}

const AutocompleteInput = ({
  label,
  nodes,
  value,
  onChange,
  icon: Icon
}: {
  label: string;
  nodes: GraphNode[];
  value: string;
  onChange: (val: string) => void;
  icon: any;
}) => {
  const [showSuggestions, setShowSuggestions] = useState(false);
  const [inputValue, setInputValue] = useState(value);
  const wrapperRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const node = nodes.find(n => n.id === value);
    setInputValue(node ? (node.title || node.id) : value);
  }, [value, nodes]);

  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (wrapperRef.current && !wrapperRef.current.contains(event.target as Node)) {
        setShowSuggestions(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const filtered = nodes.filter(n => (n.title || n.id).toLowerCase().includes(inputValue.toLowerCase()));

  return (
    <div className="input-group" ref={wrapperRef} style={{ position: 'relative' }}>
      <label style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
        <Icon size={14} className="brand-icon" /> {label}
      </label>
      <input
        type="text"
        className="number-input text-input"
        value={inputValue}
        onChange={(e) => {
          setInputValue(e.target.value);
          onChange(e.target.value);
          setShowSuggestions(true);
        }}
        onFocus={() => setShowSuggestions(true)}
        placeholder={`Search ${label.toLowerCase()} node...`}
      />
      {showSuggestions && inputValue && filtered.length > 0 && (
        <div className="autocomplete-dropdown">
          {filtered.slice(0, 50).map(n => (
            <div
              key={n.id}
              className="autocomplete-item"
              onClick={() => {
                setInputValue(n.title || n.id);
                onChange(n.id);
                setShowSuggestions(false);
              }}
            >
              {n.title || n.id}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

const SidePanel: React.FC<SidePanelProps> = ({
  nodes,
  edges,
  edgesB = [],
  cancelledEdges,
  cancelledEdgesB = new Set(),
  onCalculateRoute,
  onUncancelEdge,
  onAddManualEdge,
  onDeleteManualEdge,
  onEditManualEdge,
  selectedEdges = [],
  onCancelSelectedEdges,
  onManualCancel,
  routesCount = 0,
  onCompareUpload,
  isParsing = false,
  showComparedMap,
  pathTarget = 'A',
  onPathTargetChange,
  ledgerTarget = 'Both',
  onLedgerTargetChange
}) => {
  const { t, dir } = useI18n();
  const [source, setSource] = useState('');
  const [dest, setDest] = useState('');

  const [showManualForm, setShowManualForm] = useState(false);
  const [manualFrom, setManualFrom] = useState('');
  const [manualTo, setManualTo] = useState('');
  const [manualCost, setManualCost] = useState('');

  const [showManualCancelForm, setShowManualCancelForm] = useState(false);
  const [cancelFrom, setCancelFrom] = useState('');
  const [cancelTo, setCancelTo] = useState('');

  const handleManualCancelSubmit = () => {
    if (!cancelFrom || !cancelTo) return;
    onManualCancel?.(cancelFrom, cancelTo);
    setCancelFrom('');
    setCancelTo('');
    setShowManualCancelForm(false);
  };

  const handleRoute = () => {
    if (source && dest) {
      onCalculateRoute(source, dest);
    }
  };

  const handleAddEdge = () => {
    const cost = parseFloat(manualCost);
    if (manualFrom && manualTo && !isNaN(cost)) {
      onAddManualEdge(manualFrom, manualTo, cost);
      setShowManualForm(false);
      setManualFrom('');
      setManualTo('');
      setManualCost('');
    }
  };

  return (
    <aside className="side-panel" dir={dir}>
      <div className="panel-header" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
        {t('sidepanel.networkControls')}
      </div>

      <div className="panel-content">
        {nodes.length === 0 ? (
          <div style={{ color: 'var(--text-secondary)', fontSize: '0.875rem' }}>
            {t('sidepanel.importFirst')}
          </div>
        ) : (
          <>
            {onCompareUpload && (
              <div className="routing-section" style={{ marginBottom: '16px' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                  <div className="file-input-wrapper" style={{ flex: 1 }}>
                    <button className="btn" disabled={isParsing} style={{ width: '100%', justifyContent: 'center' }}>
                      <FilePlus size={16} />
                      {t('sidepanel.compareMap')}
                    </button>
                    <input 
                      type="file" 
                      accept=".csv" 
                      onChange={onCompareUpload} 
                      disabled={isParsing}
                    />
                  </div>
                  <InfoTooltip text={t('sidepanel.compareTooltip')} />
                </div>
              </div>
            )}
            
            <div className="routing-section">
              <h3 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
                {t('sidepanel.pathfinding')}
                <InfoTooltip text={t('sidepanel.pathfindingTooltip')} />
                {showComparedMap && (
                  <select 
                    value={pathTarget} 
                    onChange={e => onPathTargetChange?.(e.target.value as 'A' | 'B')}
                    style={{ marginLeft: 'auto', background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '4px', padding: '2px 4px', fontSize: '0.75rem', fontFamily: 'inherit' }}
                  >
                    <option value="A" style={{ fontFamily: 'inherit' }}>{t('app.mapA')}</option>
                    <option value="B" style={{ fontFamily: 'inherit' }}>{t('app.mapB')}</option>
                  </select>
                )}
              </h3>
              <AutocompleteInput
                label={t('sidepanel.sourceNode')}
                nodes={nodes}
                value={source}
                onChange={setSource}
                icon={MapPin}
              />
              <AutocompleteInput
                label={t('sidepanel.destNode')}
                nodes={nodes}
                value={dest}
                onChange={setDest}
                icon={Navigation}
              />

              <button
                className="btn btn-primary"
                style={{ width: '100%', marginTop: '12px', justifyContent: 'center' }}
                onClick={handleRoute}
                disabled={!source || !dest}
              >
                <Route size={16} />
                {t('sidepanel.calcRoute')}
              </button>

              {routesCount > 1 && (
                <div style={{ marginTop: '12px', padding: '8px', background: 'rgba(16, 185, 129, 0.1)', border: '1px solid #10b981', borderRadius: '4px', color: '#10b981', fontSize: '0.875rem', textAlign: 'center', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px' }}>
                  {t('sidepanel.foundRoutes').replace('{count}', routesCount.toString())}
                  {routesCount > 3 && (
                    <InfoTooltip text={t('sidepanel.routesTooltip')} />
                  )}
                </div>
              )}
            </div>



            <div className="routing-section" style={{ marginTop: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px', whiteSpace: 'nowrap' }}>
                  {t('sidepanel.cancellationLedger')}
                  <InfoTooltip text={t('sidepanel.ledgerTooltip')} />
                  {showComparedMap && (
                    <select 
                      value={ledgerTarget} 
                      onChange={e => onLedgerTargetChange?.(e.target.value as 'A' | 'B' | 'Both')}
                      style={{ marginLeft: 'auto', background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '4px', padding: '2px 4px', fontSize: '0.75rem', fontFamily: 'inherit' }}
                    >
                      <option value="A" style={{ fontFamily: 'inherit' }}>{t('app.mapA')}</option>
                      <option value="B" style={{ fontFamily: 'inherit' }}>{t('app.mapB')}</option>
                      <option value="Both" style={{ fontFamily: 'inherit' }}>{t('app.mapBoth')}</option>
                    </select>
                  )}
                </h3>
                <button 
                  className="icon-btn" 
                  onClick={() => setShowManualCancelForm(!showManualCancelForm)}
                  title={showManualCancelForm ? "Close manual form" : "Add manual cancellation"}
                >
                  {showManualCancelForm ? <XCircle size={16} /> : <Plus size={16} />}
                </button>
              </div>

              <button
                className="btn btn-primary"
                style={{
                  width: '100%',
                  justifyContent: 'center',
                  marginBottom: '10px',
                  padding: '8px 12px',
                  fontSize: '0.8125rem',
                  filter: selectedEdges.length === 0 ? 'grayscale(100%) opacity(0.6)' : 'none',
                  transition: 'all 0.2s ease'
                }}
                onClick={onCancelSelectedEdges}
                disabled={selectedEdges.length === 0}
              >
                {t('sidepanel.cancelSelected')}
              </button>

              {showManualCancelForm && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--bg-primary)', padding: '8px', borderRadius: '6px', marginBottom: '8px' }}>
                  <AutocompleteInput label={t('sidepanel.from')} nodes={nodes} value={cancelFrom} onChange={setCancelFrom} icon={MapPin} />
                  <AutocompleteInput label={t('sidepanel.to')} nodes={nodes} value={cancelTo} onChange={setCancelTo} icon={Navigation} />
                  <button className="btn" style={{ padding: '4px 8px', fontSize: '0.75rem', justifyContent: 'center' }} onClick={handleManualCancelSubmit}>{t('sidepanel.disableEdge')}</button>
                </div>
              )}

              {(cancelledEdges.size > 0) || (showComparedMap && cancelledEdgesB && cancelledEdgesB.size > 0) ? (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                  {(() => {
                    const grouped = new Map<string, { ids: string[], maps: Set<'A' | 'B'>, primaryEdge: GraphEdge | undefined }>();
                    
                    const addEdgeToGroup = (edgeId: string, edgeList: GraphEdge[], mapType: 'A' | 'B') => {
                      const edge = edgeList.find(e => e.id === edgeId);
                      if (edge) {
                        const key = [edge.from, edge.to].sort().join('-');
                        if (!grouped.has(key)) grouped.set(key, { ids: [], maps: new Set(), primaryEdge: edge });
                        grouped.get(key)!.ids.push(edgeId);
                        grouped.get(key)!.maps.add(mapType);
                      } else {
                        if (!grouped.has(edgeId)) grouped.set(edgeId, { ids: [], maps: new Set(), primaryEdge: undefined });
                        grouped.get(edgeId)!.ids.push(edgeId);
                        grouped.get(edgeId)!.maps.add(mapType);
                      }
                    };

                    Array.from(cancelledEdges).forEach(edgeId => addEdgeToGroup(edgeId, edges, 'A'));
                    if (showComparedMap && cancelledEdgesB) {
                      Array.from(cancelledEdgesB).forEach(edgeId => addEdgeToGroup(edgeId, edgesB, 'B'));
                    }

                    return Array.from(grouped.entries()).map(([key, data]) => {
                      const mapTag = data.maps.has('A') && data.maps.has('B') ? t('app.mapBoth') : (data.maps.has('A') ? t('app.mapA') : t('app.mapB'));
                      return (
                        <div key={key} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(239, 68, 68, 0.1)', padding: '6px 8px', borderRadius: '4px', fontSize: '0.75rem', border: '1px solid rgba(239, 68, 68, 0.2)' }}>
                          <div style={{ display: 'flex', flexDirection: 'column' }}>
                            <span>{data.primaryEdge ? `${data.primaryEdge.from} ↔ ${data.primaryEdge.to}` : data.ids[0]}</span>
                            {showComparedMap && <span style={{ fontSize: '0.65rem', opacity: 0.7 }}>{mapTag}</span>}
                          </div>
                          <button className="icon-btn" onClick={() => onUncancelEdge(data.ids)} style={{ padding: '2px' }} title="Un-cancel">
                            <RotateCcw size={14} color="var(--success)" />
                          </button>
                        </div>
                      );
                    });
                  })()}
                </div>
              ) : (
                <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>{t('sidepanel.noCancelled')}</div>
              )}
            </div>

            <div className="routing-section" style={{ marginTop: '12px' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
                <h3 className="section-title" style={{ margin: 0, display: 'flex', alignItems: 'center', gap: '8px' }}>
                  {t('sidepanel.manualEdges')}
                  <InfoTooltip text={t('sidepanel.manualTooltip')} />
                  {showComparedMap && (
                    <select 
                      value={ledgerTarget} 
                      onChange={e => onLedgerTargetChange?.(e.target.value as 'A' | 'B' | 'Both')}
                      style={{ marginLeft: 'auto', background: 'var(--bg-secondary)', border: '1px solid var(--border)', color: 'var(--text-primary)', borderRadius: '4px', padding: '2px 4px', fontSize: '0.75rem', fontFamily: 'inherit' }}
                    >
                      <option value="A" style={{ fontFamily: 'inherit' }}>{t('app.mapA')}</option>
                      <option value="B" style={{ fontFamily: 'inherit' }}>{t('app.mapB')}</option>
                      <option value="Both" style={{ fontFamily: 'inherit' }}>{t('app.mapBoth')}</option>
                    </select>
                  )}
                </h3>
                <button className="icon-btn" onClick={() => setShowManualForm(!showManualForm)}>
                  {showManualForm ? <XCircle size={16} /> : <Plus size={16} />}
                </button>
              </div>

              {showManualForm && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px', background: 'var(--bg-primary)', padding: '8px', borderRadius: '6px' }}>
                  <AutocompleteInput label={t('sidepanel.from')} nodes={nodes} value={manualFrom} onChange={setManualFrom} icon={MapPin} />
                  <AutocompleteInput label={t('sidepanel.to')} nodes={nodes} value={manualTo} onChange={setManualTo} icon={Navigation} />
                  <div className="input-group">
                    <label style={{ fontSize: '0.75rem' }}>{t('sidepanel.cost')}</label>
                    <input type="number" className="number-input" style={{ padding: '6px' }} value={manualCost} onChange={e => setManualCost(e.target.value)} />
                  </div>
                  <button className="btn btn-primary" style={{ padding: '4px 8px', fontSize: '0.75rem', justifyContent: 'center' }} onClick={handleAddEdge}>{t('sidepanel.addEdge')}</button>
                </div>
              )}

              {edges.filter(e => e.id.startsWith('manual_')).length > 0 && (
                <div style={{ display: 'flex', flexDirection: 'column', gap: '6px', marginTop: '8px' }}>
                  {edges.filter(e => e.id.startsWith('manual_')).map(e => (
                    <div key={e.id} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(99, 102, 241, 0.1)', padding: '6px 8px', borderRadius: '4px', fontSize: '0.75rem', border: '1px solid rgba(99, 102, 241, 0.2)' }}>
                      <span>{e.from} → {e.to} (Cost: {e.cost})</span>
                      <div style={{ display: 'flex', gap: '4px' }}>
                        <button className="icon-btn" style={{ padding: '4px' }} onClick={() => {
                          const newCost = window.prompt(`Enter new cost for ${e.from} → ${e.to}:`, e.cost.toString());
                          if (newCost && !isNaN(Number(newCost))) {
                            onEditManualEdge?.(e.id, Number(newCost));
                          }
                        }}>
                          <Edit2 size={12} />
                        </button>
                        <button className="icon-btn" style={{ padding: '4px', color: '#ef4444' }} onClick={() => onDeleteManualEdge?.(e.id)}>
                          <Trash2 size={12} />
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </>
        )}
      </div>
    </aside>
  );
};

export default SidePanel;
