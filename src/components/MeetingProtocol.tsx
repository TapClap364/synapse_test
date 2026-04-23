// src/components/MeetingProtocol.tsx
import React from 'react';
import { Calendar, FileText } from 'lucide-react';
import type { Meeting } from '../types';

interface MeetingProtocolProps {
  meeting: Meeting;
}

export const MeetingProtocol: React.FC<MeetingProtocolProps> = ({ meeting }) => {
  return (
    <div className="protocol">
      <div className="protocol__header">
        <h1 className="protocol__title">{meeting.title}</h1>
        <div className="protocol__date" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Calendar size={14} aria-hidden="true" />
          {new Date(meeting.created_at).toLocaleString()}
        </div>
      </div>

      <div className="protocol__section">
        <h2 className="protocol__section-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
          <FileText size={18} aria-hidden="true" /> Резюме
        </h2>
        <div className="protocol__summary">
          {meeting.summary || 'Резюме отсутствует.'}
        </div>
      </div>
    </div>
  );
};
