import { useState, useRef } from 'react';
import { createPortal } from 'react-dom';
import { Info } from 'lucide-react';
import { useI18n } from '../i18n';

export const InfoTooltip = ({ text }: { text: string }) => {
  const { dir } = useI18n();
  const [show, setShow] = useState(false);
  const [coords, setCoords] = useState({ top: 0, left: 0 });
  const iconRef = useRef<HTMLDivElement>(null);

  const handleMouseEnter = () => {
    if (iconRef.current) {
      const rect = iconRef.current.getBoundingClientRect();
      setCoords({
        top: rect.top,
        left: rect.left + rect.width / 2
      });
    }
    setShow(true);
  };

  return (
    <div 
      ref={iconRef}
      style={{ position: 'relative', display: 'flex', alignItems: 'center' }}
      onMouseEnter={handleMouseEnter}
      onMouseLeave={() => setShow(false)}
      onClick={e => e.stopPropagation()}
    >
      <Info size={14} style={{ color: 'var(--text-secondary)', cursor: 'help' }} />
      {show && createPortal(
        <div style={{
          position: 'fixed', // use fixed instead of absolute to avoid scrolling issues
          bottom: window.innerHeight - coords.top + 8,
          right: window.innerWidth - coords.left - 15,
          background: '#27272a',
          border: '1px solid var(--border)',
          borderRadius: '6px',
          padding: '8px 12px',
          width: '200px',
          zIndex: 100000,
          boxShadow: '0 10px 25px -5px rgba(0, 0, 0, 0.5)',
          color: 'var(--text-primary)',
          fontSize: '0.75rem',
          whiteSpace: 'normal',
          lineHeight: '1.4',
          textAlign: dir === 'rtl' ? 'right' : 'left',
          fontWeight: 400
        }} dir={dir}>
          {text}
          <div style={{
            position: 'absolute',
            bottom: '-5px',
            right: '11px',
            transform: 'rotate(45deg)',
            width: '8px',
            height: '8px',
            background: '#27272a',
            borderBottom: '1px solid var(--border)',
            borderRight: '1px solid var(--border)'
          }} />
        </div>,
        document.body
      )}
    </div>
  );
};
