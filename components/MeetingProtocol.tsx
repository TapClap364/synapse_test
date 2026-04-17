// src/components/MeetingProtocol.tsx
import React from 'react';
import type { Meeting } from '../types';
import { MindMapViewer } from './MindMapViewer';

interface MeetingProtocolProps {
  meeting: Meeting;
}

export const MeetingProtocol: React.FC<MeetingProtocolProps> = ({ meeting }) => {
  return (
    <div className="protocol">
      <div className="protocol__header">
        <h1 className="protocol__title">{meeting.title}</h1>
        <div className="protocol__date">📅 {new Date(meeting.created_at).toLocaleString()}</div>
      </div>

      <div className="protocol__section">
        <h2 className="protocol__section-title">📝 Резюме</h2>
        <div className="protocol__summary">
          {meeting.summary || 'Резюме отсутствует.'}
        </div>
      </div>

      <div className="protocol__section">
        <h2 className="protocol__section-title">🧠 Mind Map</h2>
        <div className="protocol__mindmap-container">
          {meeting.mind_map_data ? (
            <MindMapViewer node={meeting.mind_map_data} />
          ) : (
            <p style={{ color: '#94a3b8' }}>Карта мыслей не сгенерирована.</p>
          )}
        </div>
      </div>
    </div>
  );
};
