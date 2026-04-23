import React, { useState } from 'react';

interface OnboardingStep {
  title: string;
  description: string;
  icon: string;
}

const STEPS: OnboardingStep[] = [
  {
    title: "Добро пожаловать в Synapse AI",
    description: "Ваш новый центр управления проектами, где ИИ берет на себя рутину. Мы создали платформу, которая понимает ваши цели.",
    icon: "🚀"
  },
  {
    title: "AI-Оркестратор",
    description: "Нажмите кнопку оркестрации, и ИИ сам распределит задачи между участниками команды, учитывая их реальные навыки и загрузку.",
    icon: "🧠"
  },
  {
    title: "Протоколы и Аналитика",
    description: "Проводите встречи, а ИИ составит протоколы и сгенерирует профессиональные отчёты прямо в вашу Базу Знаний.",
    icon: "📊"
  },
  {
    title: "Обучите свой ИИ",
    description: "Загрузите свою должностную инструкцию в личном кабинете, чтобы ИИ понимал ваши функции и помогал эффективнее.",
    icon: "📝"
  }
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

  return (
    <div className="modal-overlay" style={{ zIndex: 9999 }}>
      <div className="modal" style={{ width: '500px', textAlign: 'center', padding: '40px' }}>
        <div style={{ fontSize: '64px', marginBottom: '24px' }}>{step.icon}</div>
        <h2 style={{ fontSize: '24px', fontWeight: 800, marginBottom: '16px', color: 'var(--color-text)' }}>
          {step.title}
        </h2>
        <p style={{ fontSize: '16px', lineHeight: '1.6', color: 'var(--color-text-secondary)', marginBottom: '32px' }}>
          {step.description}
        </p>

        <div style={{ display: 'flex', justifyContent: 'center', gap: '8px', marginBottom: '32px' }}>
          {STEPS.map((_, idx) => (
            <div 
              key={idx}
              style={{ 
                width: '8px', 
                height: '8px', 
                borderRadius: '50%', 
                background: idx === currentStep ? 'var(--color-primary)' : 'var(--color-border)',
                transition: 'all 0.3s'
              }}
            />
          ))}
        </div>

        <button 
          onClick={handleNext} 
          className="btn btn--primary" 
          style={{ width: '100%', padding: '14px', fontSize: '16px' }}
        >
          {currentStep === STEPS.length - 1 ? 'Поехали! 🚀' : 'Далее'}
        </button>
      </div>
    </div>
  );
};
