import { useBookingStore } from '@/store/bookingStore';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { addDays, isBefore, startOfDay } from 'date-fns';
import { ChevronLeft } from 'lucide-react';

export function DateStep() {
  const { 
    business, 
    selectedDate, 
    setSelectedDate, 
    setStep 
  } = useBookingStore();
  
  const today = startOfDay(new Date());
  const minDate = business?.allow_same_day ? today : addDays(today, 1);
  const maxDate = addDays(today, business?.max_booking_horizon_days || 30);
  
  const handleDateSelect = (date: Date | undefined) => {
    if (date) {
      setSelectedDate(date);
    }
  };
  
  const handleContinue = () => {
    if (selectedDate) {
      setStep('time');
    }
  };
  
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex justify-center">
        <Calendar
          mode="single"
          selected={selectedDate || undefined}
          onSelect={handleDateSelect}
          disabled={(date) => 
            isBefore(date, minDate) || 
            isBefore(maxDate, date)
          }
          initialFocus
        />
      </div>
      
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => setStep('selection')}
          className="flex-shrink-0"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <Button 
          onClick={handleContinue} 
          disabled={!selectedDate}
          className="flex-1"
          size="lg"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}

