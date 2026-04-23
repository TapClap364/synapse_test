// src/components/MeetingProtocol.tsx
import React from 'react';
import { Calendar, FileText } from 'lucide-react';
import type { Meeting } from '../types';

interface MeetingProtocolProps {
  meeting: Meeting;
}

interface ParsedSection {
  heading: string;
  bullets: string[];
  paragraph: string;
}

function parseMarkdown(text: string): ParsedSection[] {
  const lines = text.split('\n');
  const sections: ParsedSection[] = [];
  let current: ParsedSection | null = null;
  for (const raw of lines) {
    const line = raw.trim();
    if (line.startsWith('## ')) {
      if (current) sections.push(current);
      current = { heading: line.slice(3).trim(), bullets: [], paragraph: '' };
    } else if (line.startsWith('- ')) {
      if (!current) current = { heading: '', bullets: [], paragraph: '' };
      current.bullets.push(line.slice(2).trim());
    } else if (line) {
      if (!current) current = { heading: '', bullets: [], paragraph: '' };
      current.paragraph = current.paragraph ? `${current.paragraph} ${line}` : line;
    }
  }
  if (current) sections.push(current);
  return sections;
}

export const MeetingProtocol: React.FC<MeetingProtocolProps> = ({ meeting }) => {
  const summary = meeting.summary || '';
  const sections = parseMarkdown(summary);
  const isStructured = sections.some((s) => s.heading);

  return (
    <div className="protocol">
      <div className="protocol__header">
        <h1 className="protocol__title">{meeting.title}</h1>
        <div className="protocol__date" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
          <Calendar size={14} aria-hidden="true" />
          {new Date(meeting.created_at).toLocaleString()}
        </div>
      </div>

      {isStructured ? (
        sections.map((s, i) => (
          <div className="protocol__section" key={i}>
            {s.heading && (
              <h2 className="protocol__section-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
                <FileText size={18} aria-hidden="true" /> {s.heading}
              </h2>
            )}
            <div className="protocol__summary">
              {s.paragraph && <p style={{ margin: 0 }}>{s.paragraph}</p>}
              {s.bullets.length > 0 && (
                <ul style={{ margin: s.paragraph ? '8px 0 0' : 0, paddingLeft: 20 }}>
                  {s.bullets.map((b, j) => (
                    <li key={j} style={{ marginBottom: 4 }}>{b}</li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))
      ) : (
        <div className="protocol__section">
          <h2 className="protocol__section-title" style={{ display: 'inline-flex', alignItems: 'center', gap: 8 }}>
            <FileText size={18} aria-hidden="true" /> Резюме
          </h2>
          <div className="protocol__summary" style={{ whiteSpace: 'pre-wrap' }}>
            {summary || 'Резюме отсутствует.'}
          </div>
        </div>
      )}
    </div>
  );
};
