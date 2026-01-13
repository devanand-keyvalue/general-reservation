import { useBookingStore } from '@/store/bookingStore';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { ChevronLeft, User, Phone, MessageSquare } from 'lucide-react';

export function DetailsStep() {
  const { 
    business,
    customerName, 
    setCustomerName,
    customerPhone,
    setCustomerPhone,
    notes,
    setNotes,
    setStep 
  } = useBookingStore();
  
  const handleContinue = () => {
    if (customerName.trim() && customerPhone.trim()) {
      setStep('confirm');
    }
  };
  
  const canContinue = customerName.trim().length > 0 && customerPhone.trim().length >= 10;
  
  return (
    <div className="space-y-6 animate-fade-in">
      <div className="space-y-4">
        <div className="space-y-2">
          <Label htmlFor="name" className="flex items-center gap-2">
            <User className="h-4 w-4 text-primary" />
            Your Name
          </Label>
          <Input
            id="name"
            placeholder="Enter your name"
            value={customerName}
            onChange={(e) => setCustomerName(e.target.value)}
            autoComplete="name"
          />
        </div>
        
        <div className="space-y-2">
          <Label htmlFor="phone" className="flex items-center gap-2">
            <Phone className="h-4 w-4 text-primary" />
            Phone Number
          </Label>
          <Input
            id="phone"
            type="tel"
            placeholder="(555) 123-4567"
            value={customerPhone}
            onChange={(e) => setCustomerPhone(e.target.value)}
            autoComplete="tel"
          />
          <p className="text-xs text-muted-foreground">
            We'll send your confirmation via SMS
          </p>
        </div>
        
        {business?.notes_enabled && (
          <div className="space-y-2">
            <Label htmlFor="notes" className="flex items-center gap-2">
              <MessageSquare className="h-4 w-4 text-primary" />
              Special Requests
              <span className="text-muted-foreground font-normal">(optional)</span>
            </Label>
            <Input
              id="notes"
              placeholder="Any special requests or notes..."
              value={notes}
              onChange={(e) => setNotes(e.target.value)}
            />
          </div>
        )}
      </div>
      
      <div className="flex gap-3">
        <Button
          variant="outline"
          onClick={() => setStep('time')}
          className="flex-shrink-0"
        >
          <ChevronLeft className="h-4 w-4 mr-1" />
          Back
        </Button>
        <Button 
          onClick={handleContinue} 
          disabled={!canContinue}
          className="flex-1"
          size="lg"
        >
          Review Booking
        </Button>
      </div>
    </div>
  );
}

