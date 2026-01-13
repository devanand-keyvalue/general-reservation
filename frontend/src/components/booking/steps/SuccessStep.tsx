import { useBookingStore } from '@/store/bookingStore';
import { Button } from '@/components/ui/button';
import { formatTime, formatDate, getDateString } from '@/lib/utils';
import { CheckCircle2, Calendar, Clock, Copy, ExternalLink } from 'lucide-react';
import { useState } from 'react';

export function SuccessStep() {
  const [copied, setCopied] = useState(false);
  const { 
    business,
    bookingReference,
    selectedDate,
    selectedSlot,
    partySize,
    selectedService,
    reset
  } = useBookingStore();
  
  const handleCopyReference = async () => {
    if (bookingReference) {
      await navigator.clipboard.writeText(bookingReference);
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };
  
  const handleNewBooking = () => {
    reset();
  };
  
  return (
    <div className="text-center space-y-6 animate-fade-in py-4">
      <div className="inline-flex items-center justify-center w-20 h-20 rounded-full bg-accent/10 animate-scale-in">
        <CheckCircle2 className="h-10 w-10 text-accent" />
      </div>
      
      <div className="space-y-2">
        <h2 className="font-display text-2xl font-semibold">Booking Confirmed!</h2>
        <p className="text-muted-foreground">
          {business?.type === 'restaurant' 
            ? "We're looking forward to seeing you!"
            : "We can't wait to pamper you!"}
        </p>
      </div>
      
      <div className="bg-muted/50 rounded-xl p-5 space-y-4">
        <div className="flex items-center justify-center gap-2">
          <span className="text-sm text-muted-foreground">Reference:</span>
          <span className="font-mono font-bold text-lg">{bookingReference}</span>
          <button
            onClick={handleCopyReference}
            className="p-1.5 rounded-md hover:bg-muted transition-colors"
            title="Copy reference"
          >
            <Copy className={`h-4 w-4 ${copied ? 'text-accent' : 'text-muted-foreground'}`} />
          </button>
        </div>
        
        <hr className="border-border" />
        
        <div className="flex justify-center gap-8">
          <div className="flex items-center gap-2">
            <Calendar className="h-4 w-4 text-primary" />
            <span className="text-sm">
              {selectedDate && formatDate(getDateString(selectedDate)).split(',')[0]}
            </span>
          </div>
          <div className="flex items-center gap-2">
            <Clock className="h-4 w-4 text-primary" />
            <span className="text-sm">
              {selectedSlot && formatTime(selectedSlot.start_time)}
            </span>
          </div>
        </div>
        
        <p className="text-sm text-muted-foreground">
          {business?.type === 'restaurant' 
            ? `Table for ${partySize} guest${partySize > 1 ? 's' : ''}`
            : selectedService?.name}
        </p>
      </div>
      
      <p className="text-sm text-muted-foreground">
        A confirmation has been sent to your phone.
      </p>
      
      <div className="flex flex-col gap-3">
        <Button variant="outline" className="w-full" asChild>
          <a href={`/manage/${bookingReference}`}>
            <ExternalLink className="h-4 w-4 mr-2" />
            Manage Booking
          </a>
        </Button>
        <Button onClick={handleNewBooking} className="w-full">
          Make Another Booking
        </Button>
      </div>
    </div>
  );
}

