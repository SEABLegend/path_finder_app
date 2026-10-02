import React from 'react';
import { GitCompare, X } from 'lucide-react';
import { useI18n } from '../i18n';
import type { GraphEdge } from '../engine/CsvParser';

interface DiffLogModalProps {
  edgesA: GraphEdge[];
  edgesB: GraphEdge[];
  onClose: () => void;
  onShowOnMap: () => void;
}

const DiffLogModal: React.FC<DiffLogModalProps> = ({ edgesA, edgesB, onClose, onShowOnMap }) => {
  const { t, dir } = useI18n();
  // Compute Deltas based on from-to pairs
  const setA = new Set(edgesA.map(e => `${e.from}-${e.to}`));
  const setB = new Set(edgesB.map(e => `${e.from}-${e.to}`));

  const onlyInA = edgesA.filter(e => !setB.has(`${e.from}-${e.to}`));
  const onlyInB = edgesB.filter(e => !setA.has(`${e.from}-${e.to}`));

  return (
    <div className="modal-overlay" dir={dir}>
      <div className="modal-content" style={{ width: '600px', maxWidth: '95vw', maxHeight: '80vh' }}>
        <div className="modal-header">
          <div className="brand">
            <GitCompare size={20} className="brand-icon" />
            {t('diffLog.title')}
          </div>
          <button type="button" className="icon-btn" onClick={onClose}>
            <X size={20} />
          </button>
        </div>
        
        <div className="modal-body" style={{ overflowY: 'auto' }}>
          <p className="helper-text">
            {t('diffLog.desc')}
          </p>
          
          <div style={{ display: 'flex', gap: '16px' }}>
            <div style={{ flex: 1 }}>
              <h4 style={{ color: 'var(--danger)', margin: '0 0 12px 0', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                {t('diffLog.onlyInA')} ({onlyInA.length})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {onlyInA.map(e => (
                  <div key={e.id} style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    {e.from} → {e.to} <span style={{ opacity: 0.5 }}>({t('diffLog.cost')}: {e.cost})</span>
                  </div>
                ))}
                {onlyInA.length === 0 && <span style={{ fontSize: '0.875rem', opacity: 0.5 }}>{t('diffLog.none')}</span>}
              </div>
            </div>

            <div style={{ width: '1px', background: 'var(--border)' }}></div>

            <div style={{ flex: 1 }}>
              <h4 style={{ color: 'var(--success)', margin: '0 0 12px 0', borderBottom: '1px solid var(--border)', paddingBottom: '8px' }}>
                {t('diffLog.onlyInB')} ({onlyInB.length})
              </h4>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                {onlyInB.map(e => (
                  <div key={e.id} style={{ fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                    {e.from} → {e.to} <span style={{ opacity: 0.5 }}>({t('diffLog.cost')}: {e.cost})</span>
                  </div>
                ))}
                {onlyInB.length === 0 && <span style={{ fontSize: '0.875rem', opacity: 0.5 }}>{t('diffLog.none')}</span>}
              </div>
            </div>
          </div>

          <div className="modal-actions" style={{ marginTop: '24px', flexDirection: dir === 'rtl' ? 'row-reverse' : 'row' }}>
            <button type="button" className="btn btn-primary" onClick={onShowOnMap}>
              {t('diffLog.showOnMap')}
            </button>
            <button type="button" className="btn" onClick={onClose}>
              {t('diffLog.close')}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default DiffLogModal;
