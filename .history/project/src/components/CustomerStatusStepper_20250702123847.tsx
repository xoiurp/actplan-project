import React from 'react';
import { cn } from '@/lib/utils';
import { CheckCircle, Circle, Loader } from 'lucide-react';
import { Customer } from '@/types';

interface StepperProps {
  customerStatus: Customer['status'];
}

const steps = [
  'Prospect',
  'Proposta Enviada',
  'Aguardando Assinatura',
  'Ativo',
];

export function CustomerStatusStepper({ customerStatus }: StepperProps) {
  const currentStepIndex = steps.findIndex(step => step === customerStatus);

  return (
    <div className="w-full py-4">
      <ol className="flex items-center w-full">
        {steps.map((step, index) => {
          const isCompleted = currentStepIndex >= index;
          const isCurrent = currentStepIndex === index;
          const isLastStep = index === steps.length - 1;

          return (
            <React.Fragment key={step}>
              <li
                className={cn(
                  'flex w-full items-center',
                  { 'text-primary': isCompleted },
                  { 'text-gray-500 dark:text-gray-400': !isCompleted }
                )}
              >
                <div className="flex flex-col items-center text-center">
                  <div className="flex items-center justify-center w-10 h-10 rounded-full bg-gray-100 dark:bg-gray-800 ring-4 ring-white dark:ring-gray-900">
                    {isCompleted ? (
                      <CheckCircle className="w-6 h-6 text-primary" />
                    ) : (
                      <Circle className="w-6 h-6 text-gray-400" />
                    )}
                  </div>
                  <div className="mt-2 text-xs font-medium whitespace-nowrap">{step}</div>
                </div>
              </li>
              {!isLastStep && (
                <div className="flex-auto border-t-2 transition duration-500 ease-in-out"
                  style={{
                    borderColor: isCompleted ? 'hsl(var(--primary))' : '#E5E7EB'
                  }}
                ></div>
              )}
            </React.Fragment>
          );
        })}
      </ol>
    </div>
  );
}
