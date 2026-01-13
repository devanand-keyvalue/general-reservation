import { useBookingStore } from '@/store/bookingStore';
import { cn } from '@/lib/utils';
import { Check } from 'lucide-react';

const steps = [
  { key: 'selection', label: 'Select' },
  { key: 'date', label: 'Date' },
  { key: 'time', label: 'Time' },
  { key: 'details', label: 'Details' },
  { key: 'confirm', label: 'Confirm' },
];

export function StepIndicator() {
  const { step: currentStep } = useBookingStore();
  
  const currentIndex = steps.findIndex(s => s.key === currentStep);
  
  return (
    <div className="flex items-center justify-between">
      {steps.map((step, index) => {
        const isCompleted = index < currentIndex;
        const isCurrent = index === currentIndex;
        
        return (
          <div key={step.key} className="flex items-center">
            <div className="flex flex-col items-center">
              <div
                className={cn(
                  "w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium transition-all duration-300",
                  isCompleted && "bg-accent text-accent-foreground",
                  isCurrent && "bg-primary text-primary-foreground shadow-lg scale-110",
                  !isCompleted && !isCurrent && "bg-muted text-muted-foreground"
                )}
              >
                {isCompleted ? (
                  <Check className="h-4 w-4" />
                ) : (
                  index + 1
                )}
              </div>
              <span
                className={cn(
                  "text-xs mt-1 hidden sm:block transition-colors",
                  isCurrent ? "text-foreground font-medium" : "text-muted-foreground"
                )}
              >
                {step.label}
              </span>
            </div>
            {index < steps.length - 1 && (
              <div
                className={cn(
                  "w-8 sm:w-12 h-0.5 mx-1 transition-colors duration-300",
                  index < currentIndex ? "bg-accent" : "bg-muted"
                )}
              />
            )}
          </div>
        );
      })}
    </div>
  );
}

