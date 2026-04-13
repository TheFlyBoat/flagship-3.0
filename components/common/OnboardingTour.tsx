import React, { useState } from 'react';
import Card from './Card';
import Logo from './Logo';
import { AppView } from '../../types';
import { ICONS } from '../../constants';

interface OnboardingTourProps {
  isOpen: boolean;
  onClose: () => void;
}

const TOUR_STEPS = [
  {
    icon: <Logo className="h-12 w-12 text-primary" />,
    title: 'Welcome to FlagShip 2.0!',
    description: 'Your all-in-one career toolkit. This quick tour will show you how to navigate the key features to land your next job.',
  },
  {
    icon: ICONS.ATS,
    title: AppView.ATS,
    description: 'Optimize your CV for any job. Paste your resume and a job description to get a detailed fit-score, keyword analysis, and suggestions for improvement.',
  },
  {
    icon: ICONS.Portfolio,
    title: AppView.Portfolio,
    description: "Get expert AI feedback on your projects. Submit a case study and target role to see how a hiring manager would score your work's clarity and impact.",
  },
  {
    icon: ICONS.Tracker,
    title: AppView.Tracker,
    description: 'Manage your job search with a visual Kanban board. Track applications from "Applied" to "Offer" and analyze your performance with the dashboard.',
  },
  {
    icon: ICONS.Interview,
    title: AppView.Interview,
    description: 'Ace your next interview. Practice with AI-generated questions tailored to your target role and receive instant, constructive feedback on your answers.',
  },
];

const OnboardingTour: React.FC<OnboardingTourProps> = ({ isOpen, onClose }) => {
  const [currentStep, setCurrentStep] = useState(0);

  if (!isOpen) {
    return null;
  }

  const handleNext = () => {
    if (currentStep < TOUR_STEPS.length - 1) {
      setCurrentStep(currentStep + 1);
    } else {
      onClose(); // Finish on the last step
    }
  };

  const handlePrev = () => {
    if (currentStep > 0) {
      setCurrentStep(currentStep - 1);
    }
  };

  const step = TOUR_STEPS[currentStep];

  return (
    <div className="fixed inset-0 bg-black bg-opacity-60 z-50 flex items-center justify-center p-4 animate-fadeIn">
      <Card className="max-w-md w-full relative transform transition-all">
        <div className="text-center p-4">
          <div className="flex justify-center mb-4 text-primary">
            {React.cloneElement(step.icon as React.ReactElement, { className: "h-12 w-12" })}
          </div>
          <h2 className="text-2xl font-bold text-text-primary mb-2">{step.title}</h2>
          <p className="text-text-secondary">{step.description}</p>
        </div>

        <div className="flex justify-center my-4 space-x-2">
          {TOUR_STEPS.map((_, index) => (
            <div
              key={index}
              className={`h-2 w-2 rounded-full transition-colors ${
                index === currentStep ? 'bg-primary' : 'bg-border'
              }`}
            />
          ))}
        </div>

        <div className="flex justify-between items-center mt-6">
          <button
            onClick={onClose}
            className="text-sm font-semibold text-text-secondary hover:text-primary"
          >
            Skip Tour
          </button>
          <div className="flex gap-2">
            {currentStep > 0 && (
              <button
                onClick={handlePrev}
                className="px-4 py-2 bg-surface text-text-primary font-semibold rounded-lg border border-border hover:bg-background"
              >
                Previous
              </button>
            )}
            <button
              onClick={handleNext}
              className="px-6 py-2 bg-primary text-white font-semibold rounded-lg shadow-md hover:opacity-90"
            >
              {currentStep === TOUR_STEPS.length - 1 ? 'Finish' : 'Next'}
            </button>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default OnboardingTour;