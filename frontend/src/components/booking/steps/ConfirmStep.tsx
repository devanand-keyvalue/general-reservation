import { useState } from 'react';
import { useBookingStore } from '@/store/bookingStore';
import { createBooking } from '@/lib/api';
import { Button } from '@/components/ui/button';
import { formatTime, formatDate, getDateString } from '@/lib/utils';
import { 
  ChevronLeft, 
  Calendar, 
  Clock, 
  Users, 
  Sparkles, 
  User, 
  Phone,
  Loader2,
  AlertCircle
} from 'lucide-react';

interface ConfirmStepProps {
  businessId: string;
}

export function ConfirmStep({ businessId }: ConfirmStepProps) {
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  
  const { 
    business,
    partySize,
    selectedService,
    selectedStaffId,
    selectedDate,
    selectedSlot,
    customerName,
    customerPhone,
    notes,
    setBookingResult,
    setStep 
  } = useBookingStore();
  
  // Get the staff from the slot resources, or use the selected staff preference
  const assignedStaff = selectedSlot?.resources?.find(r => r.type === 'staff');
  const staffIdToUse = assignedStaff?.id || selectedStaffId;
  
  const handleConfirm = async () => {
    if (!selectedDate || !selectedSlot) return;
    
    setIsSubmitting(true);
    setError(null);
    
    try {
      const result = await createBooking(businessId, {
        date: getDateString(selectedDate),
        start_time: selectedSlot.start_time,
        customer_name: customerName,
        customer_phone: customerPhone,
        party_size: business?.type === 'restaurant' ? partySize : undefined,
        service_id: business?.type === 'spa' ? selectedService?.id : undefined,
        staff_id: business?.type === 'spa' ? (staffIdToUse || undefined) : undefined,
        notes: notes || undefined,
      });
      
      setBookingResult(result.booking.reference, result.booking.id);
      setStep('success');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to create booking');
    } finally {
      setIsSubmitting(false);
    }
  };
  
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="bg-muted/50 rounded-xl p-5 space-y-4">
        <h3 className="font-display font-semibold text-lg">Booking Summary</h3>
        
        <div className="space-y-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Calendar className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Date</p>
              <p className="font-medium">
                {selectedDate && formatDate(getDateString(selectedDate))}
              </p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
              <Clock className="h-5 w-5 text-primary" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Time</p>
              <p className="font-medium">
                {selectedSlot && formatTime(selectedSlot.start_time)}
              </p>
            </div>
          </div>
          
          {business?.type === 'restaurant' ? (
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                <Users className="h-5 w-5 text-primary" />
              </div>
              <div>
                <p className="text-sm text-muted-foreground">Party Size</p>
                <p className="font-medium">{partySize} guests</p>
              </div>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                  <Sparkles className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="text-sm text-muted-foreground">Service</p>
                  <p className="font-medium">{selectedService?.name}</p>
                </div>
              </div>
              
              {assignedStaff && (
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-primary/10 flex items-center justify-center">
                    <Users className="h-5 w-5 text-primary" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Therapist</p>
                    <p className="font-medium">{assignedStaff.name}</p>
                  </div>
                </div>
              )}
            </>
          )}
          
          <hr className="border-border" />
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
              <User className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Name</p>
              <p className="font-medium">{customerName}</p>
            </div>
          </div>
          
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center">
              <Phone className="h-5 w-5 text-accent" />
            </div>
            <div>
              <p className="text-sm text-muted-foreground">Phone</p>
              <p className="font-medium">{customerPhone}</p>
            </div>
          </div>
        </div>
      </div>
      
      {error && (
        <div className="flex items-center gap-2 text-destructive bg-destructive/10 p-3 rounded-lg">
          <AlertCircle className="h-5 w-5 flex-shrink-0" />
          <p className="text-sm">{error}</p>
        </div>
      )}
      
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => setStep('details')}
          disabled={isSubmitting}
          className="flex-shrink-0"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <Button 
          onClick={handleConfirm} 
          disabled={isSubmitting}
          className="flex-1"
          size="lg"
        >
          {isSubmitting ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Confirming...
            </>
          ) : (
            'Confirm Booking'
          )}
        </Button>
      </div>
    </div>
  );
}

