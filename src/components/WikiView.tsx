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
  const [selectedMeetingId, setSelectedMeetingId] = useState<number | null>(null);

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

  const aiReports = documents.filter(doc => doc.title.includes('AI Project Report'));
  const regularDocs = documents.filter(doc => !doc.title.includes('AI Project Report'));

  return (
    <div className="wiki">
      {/* Sidebar */}
      <div className="wiki__sidebar">
        <div className="wiki__section">
          <h3 className="wiki__section-title">📄 База знаний</h3>
          <ul className="wiki__list">
            {regularDocs.map(doc => (
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

        {aiReports.length > 0 && (
          <div className="wiki__section">
            <h3 className="wiki__section-title">📊 Отчеты ИИ</h3>
            <ul className="wiki__list">
              {aiReports.map(doc => (
                <li
                  key={doc.id}
                  className={`wiki__list-item ${selectedDocId === doc.id ? 'wiki__list-item--active' : ''}`}
                  onClick={() => { setSelectedDocId(doc.id); setSelectedMeetingId(null); }}
                  style={{ borderLeft: '3px solid #10b981' }}
                >
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                    <span>{doc.title.replace('AI Project Report - ', '')}</span>
                    <span style={{ fontSize: '10px', color: '#94a3b8' }}>Сгенерировано ИИ</span>
                  </div>
                </li>
              ))}
            </ul>
          </div>
        )}

        <div className="wiki__section">
          <h3 className="wiki__section-title">📅 Протоколы встреч</h3>
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
          <div className="wiki__empty" style={{ 
            display: 'flex', 
            flexDirection: 'column', 
            alignItems: 'center', 
            justifyContent: 'center', 
            height: '100%', 
            textAlign: 'center',
            color: 'var(--color-text-secondary)',
            animation: 'fadeIn 0.5s ease-out'
          }}>
            <div style={{ fontSize: '64px', marginBottom: '24px', filter: 'drop-shadow(0 10px 20px rgba(0,0,0,0.1))' }}>📚</div>
            <h2 style={{ fontSize: '24px', fontWeight: 800, color: 'var(--color-text)', marginBottom: '12px' }}>Центр знаний проекта</h2>
            <p style={{ maxWidth: '400px', lineHeight: '1.6', marginBottom: '32px' }}>
              Здесь хранятся все важные документы, идеи и протоколы ваших встреч. 
              Выберите существующий файл или создайте новый, чтобы начать.
            </p>
            <button className="btn btn--primary" onClick={handleNewDoc}>
              Создать первый документ
            </button>
          </div>
        )}
      </div>
    </div>
  );
};
