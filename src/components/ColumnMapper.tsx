import React, { useState } from 'react';
import type { ColumnMapping } from '../engine/CsvParser';
import { Settings, Check, X } from 'lucide-react';
import { useI18n } from '../i18n';

interface ColumnMapperProps {
  initialMapping: ColumnMapping;
  headers?: string[];
  onConfirm: (mapping: ColumnMapping) => void;
  onCancel: () => void;
}

const ColumnMapper: React.FC<ColumnMapperProps> = ({ initialMapping, headers = [], onConfirm, onCancel }) => {
  const { t, dir } = useI18n();
  const [source1, setSource1] = useState<number>(initialMapping.sourceCol + 1);
  const [dest1, setDest1] = useState<number>(initialMapping.destCol + 1);
  const [cost1, setCost1] = useState<number>(initialMapping.costCol + 1);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onConfirm({
      sourceCol: Math.max(0, source1 - 1),
      destCol: Math.max(0, dest1 - 1),
      costCol: Math.max(0, cost1 - 1),
    });
  };

  return (
    <div className="modal-overlay">
      <div className="modal-content" dir={dir}>
        <div className="modal-header">
          <div className="brand">
            <Settings size={20} className="brand-icon" />
            {t('columnMapper.title')}
          </div>
          <button type="button" className="icon-btn" onClick={onCancel}>
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-body">
          <p className="helper-text" style={{ marginBottom: '24px' }}>
            {t('columnMapper.helper')}
          </p>
          
          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <label style={{ width: '180px', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>
              {t('columnMapper.startCol')}
            </label>
            <input 
              type="number" 
              min="1"
              value={source1} 
              onChange={(e) => setSource1(parseInt(e.target.value) || 1)} 
              className="number-input"
              style={{ width: '80px', textAlign: 'center' }}
            />
            <span style={{ color: 'var(--accent)', fontSize: '0.875rem', fontWeight: 600, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {headers[source1 - 1] ? headers[source1 - 1] : <span style={{ color: 'var(--text-secondary)' }}>{t('columnMapper.unknown')}</span>}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <label style={{ width: '180px', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>
              {t('columnMapper.endCol')}
            </label>
            <input 
              type="number" 
              min="1"
              value={dest1} 
              onChange={(e) => setDest1(parseInt(e.target.value) || 1)} 
              className="number-input"
              style={{ width: '80px', textAlign: 'center' }}
            />
            <span style={{ color: 'var(--accent)', fontSize: '0.875rem', fontWeight: 600, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {headers[dest1 - 1] ? headers[dest1 - 1] : <span style={{ color: 'var(--text-secondary)' }}>{t('columnMapper.unknown')}</span>}
            </span>
          </div>

          <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
            <label style={{ width: '180px', fontSize: '0.875rem', fontWeight: 500, color: 'var(--text-primary)' }}>
              {t('columnMapper.costCol')}
            </label>
            <input 
              type="number" 
              min="1"
              value={cost1} 
              onChange={(e) => setCost1(parseInt(e.target.value) || 1)} 
              className="number-input"
              style={{ width: '80px', textAlign: 'center' }}
            />
            <span style={{ color: 'var(--accent)', fontSize: '0.875rem', fontWeight: 600, flex: 1, whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>
              {headers[cost1 - 1] ? headers[cost1 - 1] : <span style={{ color: 'var(--text-secondary)' }}>{t('columnMapper.unknown')}</span>}
            </span>
          </div>

          <div className="modal-actions" style={{ flexDirection: dir === 'rtl' ? 'row-reverse' : 'row' }}>
            <button type="button" className="btn" onClick={onCancel}>
              {t('columnMapper.cancel')}
            </button>
            <button type="submit" className="btn btn-primary">
              <Check size={16} />
              {t('columnMapper.apply')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ColumnMapper;
