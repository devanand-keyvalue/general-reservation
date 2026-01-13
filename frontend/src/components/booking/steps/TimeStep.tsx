import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getAvailability } from '@/lib/api';
import { useBookingStore } from '@/store/bookingStore';
import { Button } from '@/components/ui/button';
import { formatTime, getDateString } from '@/lib/utils';
import { ChevronLeft, Loader2, Clock, AlertCircle } from 'lucide-react';
import { cn } from '@/lib/utils';

interface TimeStepProps {
  businessId: string;
}

export function TimeStep({ businessId }: TimeStepProps) {
  const { 
    business,
    partySize,
    selectedService,
    selectedStaffId,
    selectedDate,
    selectedSlot,
    setSelectedSlot,
    setAvailableSlots,
    setStep 
  } = useBookingStore();
  
  const dateString = selectedDate ? getDateString(selectedDate) : '';
  
  const { data, isLoading, error } = useQuery({
    queryKey: ['availability', businessId, dateString, partySize, selectedService?.id, selectedStaffId],
    queryFn: () => getAvailability(businessId, dateString, {
      party_size: business?.type === 'restaurant' ? partySize : undefined,
      service_id: business?.type === 'spa' ? selectedService?.id : undefined,
      staff_id: business?.type === 'spa' ? (selectedStaffId || undefined) : undefined,
    }),
    enabled: !!dateString,
  });
  
  useEffect(() => {
    if (data?.slots) {
      setAvailableSlots(data.slots);
    }
  }, [data, setAvailableSlots]);
  
  const handleContinue = () => {
    if (selectedSlot) {
      setStep('details');
    }
  };
  
  // Group slots by time periods
  const groupedSlots = data?.slots?.reduce((acc, slot) => {
    const hour = parseInt(slot.start_time.split(':')[0]);
    let period: string;
    if (hour < 12) period = 'Morning';
    else if (hour < 17) period = 'Afternoon';
    else period = 'Evening';
    
    if (!acc[period]) acc[period] = [];
    acc[period].push(slot);
    return acc;
  }, {} as Record<string, typeof data.slots>);
  
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="flex items-center gap-2 text-muted-foreground">
        <Clock className="h-4 w-4" />
        <span className="text-sm">
          {selectedDate?.toLocaleDateString('en-US', { 
            weekday: 'long', 
            month: 'long', 
            day: 'numeric' 
          })}
        </span>
      </div>
      
      {isLoading ? (
        <div className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </div>
      ) : error ? (
        <div className="flex flex-col items-center justify-center py-12 text-destructive">
          <AlertCircle className="h-8 w-8 mb-2" />
          <p>Failed to load available times</p>
        </div>
      ) : !data?.slots?.length ? (
        <div className="text-center py-12">
          <p className="text-muted-foreground">No available times for this date</p>
          <Button 
            variant="link" 
            onClick={() => setStep('date')}
            className="mt-2"
          >
            Try another date
          </Button>
        </div>
      ) : (
        <div className="space-y-4 max-h-[300px] overflow-y-auto pr-2">
          {Object.entries(groupedSlots || {}).map(([period, slots]) => (
            <div key={period}>
              <h4 className="text-sm font-medium text-muted-foreground mb-2">
                {period}
              </h4>
              <div className="grid grid-cols-3 gap-2">
                {slots.map((slot, index) => (
                  <button
                    key={`${slot.start_time}-${index}`}
                    onClick={() => setSelectedSlot(slot)}
                    className={cn(
                      "py-3 px-2 rounded-lg text-sm font-medium transition-all duration-200",
                      selectedSlot?.start_time === slot.start_time
                        ? "bg-primary text-primary-foreground shadow-md scale-105"
                        : "bg-muted hover:bg-primary/10 hover:scale-102"
                    )}
                  >
                    {formatTime(slot.start_time)}
                  </button>
                ))}
              </div>
            </div>
          ))}
        </div>
      )}
      
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => setStep('date')}
          className="flex-shrink-0"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <Button 
          onClick={handleContinue} 
          disabled={!selectedSlot}
          className="flex-1"
          size="lg"
        >
          Continue
        </Button>
      </div>
    </div>
  );
}

