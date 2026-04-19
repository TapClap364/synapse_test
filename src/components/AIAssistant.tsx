import React, { useState, useRef, useEffect } from 'react';

interface Message {
  role: 'user' | 'assistant';
  content: string;
}

export const AIAssistant: React.FC = () => {
  const [messages, setMessages] = useState<Message[]>([
    { role: 'assistant', content: 'Привет! Я твой ИИ-ассистент Synapse. Чем могу помочь сегодня?' }
  ]);
  const [input, setInput] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollTo(0, scrollRef.current.scrollHeight);
  }, [messages]);

  const handleSend = async () => {
    if (!input.trim() || isLoading) return;

    const userMsg: Message = { role: 'user', content: input };
    setMessages(prev => [...prev, userMsg]);
    setInput('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/ai-assistant-chat', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          message: input,
          history: messages.slice(-10).map(m => ({ role: m.role, content: m.content }))
        }),
      });

      if (!res.ok) throw new Error('Ошибка API');
      const data = await res.json();
      
      setMessages(prev => [...prev, { role: 'assistant', content: data.reply }]);
    } catch (error) {
      setMessages(prev => [...prev, { role: 'assistant', content: 'Извините, произошла ошибка при связи с сервером.' }]);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: '100%', background: 'var(--color-bg)' }}>
      <div style={{ padding: '24px 40px', borderBottom: '1px solid var(--color-border)', background: '#fff' }}>
        <h2 style={{ margin: 0, fontSize: '20px', fontWeight: 700 }}>🤖 AI Ассистент</h2>
        <p style={{ margin: '4px 0 0 0', fontSize: '13px', color: '#64748b' }}>Ваш интеллектуальный помощник по проекту</p>
      </div>

      <div 
        ref={scrollRef}
        style={{ flex: 1, overflowY: 'auto', padding: '40px', display: 'flex', flexDirection: 'column', gap: '24px' }}
      >
        <div style={{ maxWidth: '800px', margin: '0 auto', width: '100%', display: 'flex', flexDirection: 'column', gap: '24px' }}>
          {messages.map((m, i) => (
            <div 
              key={i} 
              style={{ 
                alignSelf: m.role === 'user' ? 'flex-end' : 'flex-start',
                maxWidth: '80%',
                display: 'flex',
                gap: '12px',
                flexDirection: m.role === 'user' ? 'row-reverse' : 'row'
              }}
            >
              <div style={{ 
                width: '32px', 
                height: '32px', 
                borderRadius: '8px', 
                background: m.role === 'user' ? 'var(--color-primary)' : '#e2e8f0',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
                fontSize: '16px',
                flexShrink: 0
              }}>
                {m.role === 'user' ? '👤' : '🤖'}
              </div>
              <div style={{ 
                padding: '16px 20px', 
                borderRadius: '16px', 
                background: m.role === 'user' ? 'var(--color-primary)' : '#fff',
                color: m.role === 'user' ? '#fff' : 'var(--color-text)',
                boxShadow: '0 4px 12px rgba(0,0,0,0.05)',
                fontSize: '14px',
                lineHeight: '1.6',
                border: m.role === 'assistant' ? '1px solid #f1f5f9' : 'none'
              }}>
                {m.content}
              </div>
            </div>
          ))}
          {isLoading && (
            <div style={{ alignSelf: 'flex-start', display: 'flex', gap: '12px' }}>
              <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#e2e8f0', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>🤖</div>
              <div style={{ padding: '16px 20px', borderRadius: '16px', background: '#fff', border: '1px solid #f1f5f9' }}>
                <div className="dot-typing">Печатает...</div>
              </div>
            </div>
          )}
        </div>
      </div>

      <div style={{ padding: '24px 40px', background: '#fff', borderTop: '1px solid var(--color-border)' }}>
        <div style={{ maxWidth: '800px', margin: '0 auto', position: 'relative' }}>
          <textarea 
            value={input}
            onChange={e => setInput(e.target.value)}
            onKeyDown={e => e.key === 'Enter' && !e.shiftKey && (e.preventDefault(), handleSend())}
            placeholder="Спроси меня о чем угодно... (Shift+Enter для новой строки)"
            style={{
              width: '100%',
              padding: '16px 60px 16px 20px',
              borderRadius: '12px',
              border: '1px solid var(--color-border)',
              outline: 'none',
              resize: 'none',
              fontSize: '14px',
              background: 'var(--color-bg)',
              minHeight: '56px',
              maxHeight: '200px'
            }}
          />
          <button 
            onClick={handleSend}
            disabled={!input.trim() || isLoading}
            style={{
              position: 'absolute',
              right: '12px',
              bottom: '12px',
              width: '32px',
              height: '32px',
              borderRadius: '8px',
              background: 'var(--color-primary)',
              color: '#fff',
              border: 'none',
              cursor: 'pointer',
              display: 'flex',
              alignItems: 'center',
              justifyContent: 'center',
              opacity: input.trim() ? 1 : 0.5,
              transition: 'all 0.2s'
            }}
          >
            ✈️
          </button>
        </div>
      </div>
    </div>
  );
};
