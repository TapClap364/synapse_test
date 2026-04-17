// src/components/WikiView.tsx
import React, { useState } from 'react';
import { supabase } from '../lib/supabase';
import type { Document, Meeting } from '../types';
import { DocumentEditor } from './DocumentEditor';
import { MeetingProtocol } from './MeetingProtocol';

interface WikiViewProps {
  documents: Document[];
  meetings: Meeting[];
  onDocumentsChange: (docs: Document[]) => void;
  onRefreshDocuments: () => void;
}

export const WikiView: React.FC<WikiViewProps> = ({
  documents, meetings, onDocumentsChange, onRefreshDocuments,
}) => {
  const [selectedDocId, setSelectedDocId] = useState<string | null>(null);
  const [selectedMeetingId, setSelectedMeetingId] = useState<string | null>(null);

  const handleNewDoc = async () => {
    const title = prompt('Название новой страницы:', 'Новая страница');
    if (!title) return;
    const { data } = await supabase
      .from('documents')
      .insert({ title, content: '' })
      .select()
      .single();
    if (data) {
      onDocumentsChange([data as Document, ...documents]);
      setSelectedDocId(data.id);
      setSelectedMeetingId(null);
    }
  };

  const selectedMeeting = meetings.find(m => m.id === selectedMeetingId);

  return (
    <div className="wiki">
      {/* Sidebar */}
      <div className="wiki__sidebar">
        <div className="wiki__section">
          <h3 className="wiki__section-title">📄 Документы</h3>
          <ul className="wiki__list">
            {documents.map(doc => (
              <li
                key={doc.id}
                className={`wiki__list-item ${selectedDocId === doc.id ? 'wiki__list-item--active' : ''}`}
                onClick={() => { setSelectedDocId(doc.id); setSelectedMeetingId(null); }}
              >
                {doc.title}
              </li>
            ))}
          </ul>
          <button className="btn btn--ghost btn--block" style={{ marginTop: '8px' }} onClick={handleNewDoc}>
            + Новая страница
          </button>
        </div>

        <div className="wiki__section">
          <h3 className="wiki__section-title">📝 Протоколы встреч</h3>
          <ul className="wiki__list">
            {meetings.map(meeting => (
              <li
                key={meeting.id}
                className={`wiki__list-item ${selectedMeetingId === meeting.id ? 'wiki__list-item--active' : ''}`}
                onClick={() => { setSelectedMeetingId(meeting.id); setSelectedDocId(null); }}
                style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}
              >
                <span style={{ fontWeight: 600 }}>{meeting.title}</span>
                <span style={{ fontSize: '11px', color: '#94a3b8' }}>
                  {new Date(meeting.created_at).toLocaleDateString()}
                </span>
              </li>
            ))}
            {meetings.length === 0 && (
              <li className="wiki__list-item" style={{ color: '#94a3b8', cursor: 'default' }}>
                Нет встреч
              </li>
            )}
          </ul>
        </div>
      </div>

      {/* Content */}
      <div className="wiki__content">
        {selectedMeetingId && selectedMeeting ? (
          <MeetingProtocol meeting={selectedMeeting} />
        ) : selectedDocId ? (
          <DocumentEditor
            documentId={selectedDocId}
            onSave={onRefreshDocuments}
            onRefresh={onRefreshDocuments}
          />
        ) : (
          <div className="wiki__empty">
            <div className="wiki__empty-icon">📚</div>
            <h2 style={{ margin: '0 0 8px 0', color: '#1e293b' }}>База Знаний Synapse</h2>
            <p>Выберите документ или протокол встречи слева.</p>
          </div>
        )}
      </div>
    </div>
  );
};
