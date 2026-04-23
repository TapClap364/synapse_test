import React from 'react';
import { useTranslation } from 'react-i18next';
import { CalendarPlus, FileText, Zap, Loader2, type LucideIcon } from 'lucide-react';

interface LoadingModalsProps {
  isScheduling: boolean;
  isGeneratingReport: boolean;
  isOrchestrating: boolean;
}

const LoadingModal: React.FC<{ Icon: LucideIcon; text: string }> = ({ Icon, text }) => (
  <div className="modal-overlay" style={{ zIndex: 10000 }}>
    <div className="modal" style={{ display: 'inline-flex', alignItems: 'center', gap: 12, padding: '20px 28px' }}>
      <Icon size={20} aria-hidden="true" />
      <Loader2 size={16} className="animate-spin" aria-hidden="true" />
      {text}
    </div>
  </div>
);

export const LoadingModals: React.FC<LoadingModalsProps> = ({ isScheduling, isGeneratingReport, isOrchestrating }) => {
  const { t } = useTranslation();
  return (
    <>
      {isScheduling && <LoadingModal Icon={CalendarPlus} text={t('modals.scheduling')} />}
      {isGeneratingReport && <LoadingModal Icon={FileText} text={t('modals.generatingReport')} />}
      {isOrchestrating && <LoadingModal Icon={Zap} text={t('modals.orchestrating')} />}
    </>
  );
};
