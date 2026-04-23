import React from 'react';
import { useTranslation } from 'react-i18next';
import { Brain } from 'lucide-react';
import { Auth } from './Auth';

interface AuthGateProps {
  onBack: () => void;
}

export const AuthGate: React.FC<AuthGateProps> = ({ onBack }) => {
  const { t } = useTranslation();
  return (
    <div style={{
      minHeight: '100vh',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      background: 'radial-gradient(circle at top right, #eef2ff 0%, #f8fafc 50%, #f1f5f9 100%)',
      padding: 20,
    }}>
      <div style={{
        background: 'rgba(255,255,255,0.85)',
        backdropFilter: 'blur(20px)',
        padding: 40,
        borderRadius: 24,
        boxShadow: '0 25px 50px -12px rgba(0,0,0,0.08)',
        width: '100%',
        maxWidth: 440,
        border: '1px solid rgba(255,255,255,0.6)',
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 48, height: 48, borderRadius: 12,
            background: 'var(--color-primary)', color: '#fff',
            display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
            marginBottom: 12,
          }}>
            <Brain size={22} />
          </div>
          <h1 style={{ fontSize: 22, fontWeight: 900, letterSpacing: '-0.5px', color: 'var(--color-text)', margin: 0 }}>
            Synapse AI
          </h1>
        </div>
        <Auth />
        <button
          className="btn btn--ghost"
          style={{
            marginTop: 20, width: '100%', justifyContent: 'center',
            color: 'var(--color-text-secondary)', fontSize: 13,
          }}
          onClick={onBack}
        >
          {t('auth.backToProduct')}
        </button>
      </div>
    </div>
  );
};
