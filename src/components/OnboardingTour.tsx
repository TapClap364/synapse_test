import React, { useState } from 'react';
import { Sparkles, Bot, BarChart3, BookOpen, ArrowRight, type LucideIcon } from 'lucide-react';

interface OnboardingStep {
  title: string;
  description: string;
  Icon: LucideIcon;
}

const STEPS: OnboardingStep[] = [
  {
    title: 'Добро пожаловать в Synapse AI',
    description: 'Ваш новый центр управления проектами, где ИИ берёт на себя рутину. Мы создали платформу, которая понимает ваши цели.',
    Icon: Sparkles,
  },
  {
    title: 'AI-Оркестратор',
    description: 'Нажмите кнопку оркестрации, и ИИ сам распределит задачи между участниками команды, учитывая их реальные навыки и загрузку.',
    Icon: Bot,
  },
  {
    title: 'Протоколы и аналитика',
    description: 'Проводите встречи, а ИИ составит протоколы и сгенерирует профессиональные отчёты прямо в вашу Базу Знаний.',
    Icon: BarChart3,
  },
  {
    title: 'Обучите свой ИИ',
    description: 'Загрузите свою должностную инструкцию в личном кабинете, чтобы ИИ понимал ваши функции и помогал эффективнее.',
    Icon: BookOpen,
  },
];

interface OnboardingTourProps {
  onClose: () => void;
}

export const OnboardingTour: React.FC<OnboardingTourProps> = ({ onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  const handleNext = () => {
    if (currentStep < STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose();
    }
  };

  const step = STEPS[currentStep];
  const isLast = currentStep === STEPS.length - 1;

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div className="modal" style={{ width: 480, textAlign: 'center', padding: 36 }}>
        <div style={{
          width: 72, height: 72, borderRadius: '50%',
          background: 'linear-gradient(135deg, var(--color-primary) 0%, var(--color-purple) 100%)',
          color: '#fff',
          display: 'inline-flex', alignItems: 'center', justifyContent: 'center',
          marginBottom: 20,
          boxShadow: '0 12px 30px rgba(59,130,246,0.35)',
        }}>
          <step.Icon size={32} aria-hidden="true" />
        </div>
        <h2 style={{ fontSize: 22, fontWeight: 800, marginBottom: 12, color: 'var(--color-text)', letterSpacing: '-0.3px' }}>
          {step.title}
        </h2>
        <p style={{ fontSize: 15, lineHeight: 1.6, color: 'var(--color-text-secondary)', marginBottom: 28 }}>
          {step.description}
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: 6, marginBottom: 28 }}>
          {STEPS.map((_, idx) => (
            <div
              key={idx}
              style={{
                width: idx === currentStep ? 24 : 8,
                height: 8,
                borderRadius: 4,
                background: idx === currentStep ? 'var(--color-primary)' : 'var(--color-border)',
                transition: 'all 0.3s',
              }}
            />
          ))}
        </div>

        <button
          onClick={handleNext}
          className="btn btn--primary btn--lg btn--block"
          style={{ padding: 14, fontSize: 15 }}
        >
          {isLast ? 'Поехали' : 'Далее'} <ArrowRight size={16} aria-hidden="true" />
        </button>
      </div>
    </div>
  );
};
