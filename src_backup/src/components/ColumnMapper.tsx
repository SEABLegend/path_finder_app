import React, { useState } from 'react';
import type { ColumnMapping } from '../engine/CsvParser';
import { Settings, Check, X } from 'lucide-react';

interface ColumnMapperProps {
  initialMapping: ColumnMapping;
  headers?: string[];
  onConfirm: (mapping: ColumnMapping) => void;
  onCancel: () => void;
}

const ColumnMapper: React.FC<ColumnMapperProps> = ({ initialMapping, headers = [], onConfirm, onCancel }) => {
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
      <div className="modal-content">
        <div className="modal-header">
          <div className="brand">
            <Settings size={20} className="brand-icon" />
            CSV Column Mapping
          </div>
          <button type="button" className="icon-btn" onClick={onCancel}>
            <X size={20} />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="modal-body">
          <p className="helper-text">
            Specify the 1-based column numbers for your CSV data.
            By default: Column 1 = Source Node, Column 2 = Destination Node, Column 5 = Cost.
          </p>
          
          <div className="input-group">
            <label>
              Source Node Column
              {headers[source1 - 1] && <span style={{ color: 'var(--accent)', marginLeft: '8px' }}>→ "{headers[source1 - 1]}"</span>}
            </label>
            <input 
              type="number" 
              min="1"
              value={source1} 
              onChange={(e) => setSource1(parseInt(e.target.value) || 1)} 
              className="number-input"
            />
          </div>

          <div className="input-group">
            <label>
              Destination Node Column
              {headers[dest1 - 1] && <span style={{ color: 'var(--accent)', marginLeft: '8px' }}>→ "{headers[dest1 - 1]}"</span>}
            </label>
            <input 
              type="number" 
              min="1"
              value={dest1} 
              onChange={(e) => setDest1(parseInt(e.target.value) || 1)} 
              className="number-input"
            />
          </div>

          <div className="input-group">
            <label>
              Cost Column
              {headers[cost1 - 1] && <span style={{ color: 'var(--accent)', marginLeft: '8px' }}>→ "{headers[cost1 - 1]}"</span>}
            </label>
            <input 
              type="number" 
              min="1"
              value={cost1} 
              onChange={(e) => setCost1(parseInt(e.target.value) || 1)} 
              className="number-input"
            />
          </div>

          <div className="modal-actions">
            <button type="button" className="btn" onClick={onCancel}>
              Cancel
            </button>
            <button type="submit" className="btn btn-primary">
              <Check size={16} />
              Apply & Render Graph
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ColumnMapper;
