import React, { useState, useRef, useEffect } from 'react';
import { Brain, X } from 'lucide-react';
import { useWorkspace } from '../lib/workspace';
import { apiPost } from '../lib/apiClient';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const AIAssistant: React.FC = () => {
  const { currentWorkspaceId } = useWorkspace();
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Привет! Я твой ИИ-ассистент Synapse. Могу помочь с задачами, анализом вики или отчетами. О чем хочешь поговорить?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (scrollRef.current) {
      scrollRef.current.scrollTop = scrollRef.current.scrollHeight;
    }
  }, [messages, isOpen]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;
    if (!currentWorkspaceId) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Нет активного workspace. Выбери его в шапке.' }]);
      return;
    }

    const userMsg = input.trim();
    setInput('');
    setMessages(prev => [...prev, { role: 'user', content: userMsg }]);
    setIsLoading(true);

    try {
      const data = await apiPost<{ reply: string }>('/api/ai-assistant-chat', {
        workspaceId: currentWorkspaceId,
        body: { message: userMsg, history: messages },
      });
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'unknown';
      setMessages(prev => [...prev, { role: 'assistant', content: `Ошибка: ${msg}` }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {/* Кнопка вызова */}
      <button
        onClick={() => setIsOpen(!isOpen)}
        aria-label={isOpen ? 'Закрыть AI-ассистента' : 'Открыть AI-ассистента'}
        style={{
          position: 'fixed',
          bottom: '24px',
          right: '24px',
          width: '56px',
          height: '56px',
          borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-purple) 100%)',
          color: 'white',
          border: 'none',
          boxShadow: '0 10px 25px rgba(59, 130, 246, 0.35)',
          cursor: 'pointer',
          zIndex: 9999,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          transition: 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)',
        }}
        onMouseEnter={(e) => (e.currentTarget.style.transform = 'scale(1.08)')}
        onMouseLeave={(e) => (e.currentTarget.style.transform = 'scale(1)')}
      >
        {isOpen ? <X size={22} /> : <Brain size={22} />}
      </button>

      {/* Окно чата */}
      {isOpen && (
        <div style={{
          position: 'fixed',
          bottom: '100px',
          right: '30px',
          width: '380px',
          height: '550px',
          background: '#fff',
          borderRadius: '24px',
          boxShadow: '0 20px 50px rgba(0,0,0,0.15)',
          zIndex: 9999,
          display: 'flex',
          flexDirection: 'column',
          overflow: 'hidden',
          animation: 'slideUp 0.3s ease-out',
          border: '1px solid rgba(0,0,0,0.05)'
        }}>
          {/* Header */}
          <div style={{ padding: '20px', background: 'linear-gradient(90deg, #3b82f6, #8b5cf6)', color: 'white' }}>
            <div style={{ fontWeight: 800, fontSize: '16px' }}>Synapse AI Assistant</div>
            <div style={{ fontSize: '11px', opacity: 0.8 }}>Онлайн • Анализирует контекст проекта</div>
          </div>

          {/* Messages */}
          <div 
            ref={scrollRef}
            style={{ flex: 1, padding: '20px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '12px', background: '#f8fafc' }}
          >
            {messages.map((m, i) => (
              <div key={i} style={{ 
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '85%',
                padding: '12px 16px',
                borderRadius: m.role === 'user' ? '16px 16px 0 16px' : '16px 16px 16px 0',
                background: m.role === 'user' ? '#3b82f6' : '#fff',
                color: m.role === 'user' ? 'white' : '#1e293b',
                fontSize: '14px',
                lineHeight: '1.5',
                boxShadow: m.role === 'user' ? 'none' : '0 2px 5px rgba(0,0,0,0.05)'
              }}>
                {m.content}
              </div>
            ))}
            {isLoading && <div style={{ padding: '10px', fontSize: '12px', color: '#64748b' }}>ИИ думает...</div>}
          </div>

          {/* Input */}
          <div style={{ padding: '15px', borderTop: '1px solid #f1f5f9', background: '#fff' }}>
            <div style={{ display: 'flex', gap: '8px' }}>
              <input 
                type="text" 
                value={input}
                onChange={(e) => setInput(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && handleSend()}
                placeholder="Спроси меня о проекте..."
                style={{
                  flex: 1,
                  padding: '10px 15px',
                  borderRadius: '12px',
                  border: '1px solid #e2e8f0',
                  outline: 'none',
                  fontSize: '14px'
                }}
              />
              <button 
                onClick={handleSend}
                disabled={isLoading}
                style={{
                  width: '40px',
                  height: '40px',
                  borderRadius: '10px',
                  background: '#3b82f6',
                  color: 'white',
                  border: 'none',
                  cursor: 'pointer'
                }}
              >
                ➔
              </button>
            </div>
          </div>
        </div>
      )}

      <style>{`
        @keyframes slideUp {
          from { transform: translateY(20px); opacity: 0; }
          to { transform: translateY(0); opacity: 1; }
        }
      `}</style>
    </>
  );
};
