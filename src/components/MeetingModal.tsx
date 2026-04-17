// src/components/MeetingModal.tsx
import React from 'react';
import type { MeetingResult } from '../types';
import { MindMapViewer } from './MindMapViewer';

interface MeetingModalProps {
  result: MeetingResult;
  onClose: () => void;
}

export const MeetingModal: React.FC<MeetingModalProps> = ({ result, onClose }) => {
  return (
    <div className="modal-overlay">
      <div className="modal" style={{ maxWidth: '1000px', width: '100%', padding: '28px', display: 'grid', gridTemplateRows: 'auto 1fr auto', gap: '20px' }}>
        <div className="modal__header" style={{ border: 'none', padding: 0 }}>
          <h2 style={{ margin: 0, fontSize: '22px', fontWeight: 800 }}>📝 Протокол встречи</h2>
          <button className="modal__close" onClick={onClose}>✕</button>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '350px 1fr', gap: '24px', height: '400px' }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
            <div style={{ padding: '16px', background: '#f0fdf4', borderRadius: '12px', color: '#166534' }}>
              ✅ Создано задач: <strong>{result.tasksCreated}</strong>
            </div>
            <div>
              <h4 style={{ margin: '0 0 8px 0', fontSize: '15px', fontWeight: 600 }}>Резюме:</h4>
              <p style={{ margin: 0, color: '#475569', lineHeight: '1.6', fontSize: '14px' }}>
                {result.summary}
              </p>
            </div>
            <details style={{ background: '#f8fafc', borderRadius: '10px', padding: '12px', marginTop: 'auto' }}>
              <summary style={{ cursor: 'pointer', fontWeight: 600, color: '#64748b', fontSize: '12px' }}>
                🔧 Raw JSON
              </summary>
              <pre style={{ margin: '10px 0 0 0', background: '#fff', padding: '8px', fontSize: '10px', overflow: 'auto', borderRadius: '6px', border: '1px solid #e2e8f0', maxHeight: '120px' }}>
                {JSON.stringify(result.mindMap, null, 2)}
              </pre>
            </details>
          </div>

          <div style={{ background: '#f8fafc', borderRadius: '16px', border: '1px solid #e2e8f0', padding: '24px', overflow: 'auto', display: 'flex', justifyContent: 'center', alignItems: 'flex-start' }}>
            {result.mindMap ? (
              <MindMapViewer node={result.mindMap} />
            ) : (
              <p style={{ color: '#94a3b8' }}>Нет данных</p>
            )}
          </div>
        </div>

        <button className="btn btn--primary btn--block btn--lg" onClick={onClose}>
          Закрыть и продолжить
        </button>
      </div>
    </div>
  );
};
