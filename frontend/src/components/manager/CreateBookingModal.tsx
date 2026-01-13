import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Calendar } from '@/components/ui/calendar';
import { Loader2, User, Phone, Users, Clock, Sparkles } from 'lucide-react';
import { toast } from 'sonner';
import { format, addDays } from 'date-fns';
import { getAvailability, createBooking, getCatalog } from '@/lib/api';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

interface CreateBookingModalProps {
  businessId: string;
  businessType: 'restaurant' | 'spa';
  isOpen: boolean;
  onClose: () => void;
  selectedDate?: Date;
}

export function CreateBookingModal({
  businessId,
  businessType,
  isOpen,
  onClose,
  selectedDate,
}: CreateBookingModalProps) {
  const queryClient = useQueryClient();
  const [step, setStep] = useState<'details' | 'time'>('details');
  
  // Form state
  const [customerName, setCustomerName] = useState('');
  const [customerPhone, setCustomerPhone] = useState('');
  const [partySize, setPartySize] = useState(2);
  const [serviceId, setServiceId] = useState('');
  const [staffId, setStaffId] = useState('');
  const [date, setDate] = useState<Date | undefined>(selectedDate || new Date());
  const [selectedTime, setSelectedTime] = useState('');
  const [notes, setNotes] = useState('');
  
  // Fetch catalog for services/staff
  const { data: catalog } = useQuery({
    queryKey: ['catalog', businessId],
    queryFn: () => getCatalog(businessId),
    enabled: isOpen,
  });
  
  const dateString = date ? format(date, 'yyyy-MM-dd') : '';
  
  // Fetch availability
  const { data: availabilityData, isLoading: availLoading } = useQuery({
    queryKey: ['availability', businessId, dateString, partySize, serviceId, staffId],
    queryFn: () => getAvailability(businessId, dateString, {
      party_size: businessType === 'restaurant' ? partySize : undefined,
      service_id: businessType === 'spa' ? serviceId : undefined,
      staff_id: businessType === 'spa' && staffId ? staffId : undefined,
    }),
    enabled: step === 'time' && !!dateString && (businessType === 'restaurant' || !!serviceId),
  });
  
  const createMutation = useMutation({
    mutationFn: async () => {
      return createBooking(businessId, {
        date: dateString,
        start_time: selectedTime,
        customer_name: customerName,
        customer_phone: customerPhone,
        party_size: businessType === 'restaurant' ? partySize : undefined,
        service_id: businessType === 'spa' ? serviceId : undefined,
        staff_id: businessType === 'spa' && staffId ? staffId : undefined,
        notes: notes || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manager-bookings'] });
      toast.success('Booking created successfully!');
      handleClose();
    },
    onError: (err: Error) => {
      toast.error(err.message || 'Failed to create booking');
    },
  });
  
  const handleClose = () => {
    setStep('details');
    setCustomerName('');
    setCustomerPhone('');
    setPartySize(2);
    setServiceId('');
    setStaffId('');
    setSelectedTime('');
    setNotes('');
    onClose();
  };
  
  const canProceedToTime = customerName && customerPhone && 
    (businessType === 'restaurant' ? partySize > 0 : !!serviceId);
  
  const formatTime = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
  };
  
  const slots = availabilityData?.slots || [];
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {step === 'details' ? 'Create Booking' : 'Select Time'}
          </DialogTitle>
        </DialogHeader>
        
        {step === 'details' ? (
          <div className="space-y-4 py-4">
            {/* Customer Details */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <User className="h-4 w-4" />
                Customer Name
              </Label>
              <Input
                placeholder="Enter customer name"
                value={customerName}
                onChange={(e) => setCustomerName(e.target.value)}
              />
            </div>
            
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone Number
              </Label>
              <Input
                placeholder="(555) 123-4567"
                value={customerPhone}
                onChange={(e) => setCustomerPhone(e.target.value)}
              />
            </div>
            
            {/* Restaurant-specific */}
            {businessType === 'restaurant' && (
              <div className="space-y-2">
                <Label className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Party Size
                </Label>
                <Select
                  value={partySize.toString()}
                  onValueChange={(v) => setPartySize(parseInt(v))}
                >
                  <SelectTrigger>
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    {Array.from({ length: 12 }, (_, i) => i + 1).map((n) => (
                      <SelectItem key={n} value={n.toString()}>
                        {n} {n === 1 ? 'guest' : 'guests'}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}
            
            {/* Spa-specific */}
            {businessType === 'spa' && (
              <>
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <Sparkles className="h-4 w-4" />
                    Service
                  </Label>
                  <Select value={serviceId} onValueChange={setServiceId}>
                    <SelectTrigger>
                      <SelectValue placeholder="Select a service" />
                    </SelectTrigger>
                    <SelectContent>
                      {catalog?.services?.map((service) => (
                        <SelectItem key={service.id} value={service.id}>
                          {service.name} ({service.duration_minutes} min)
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label className="flex items-center gap-2">
                    <User className="h-4 w-4" />
                    Staff Preference (optional)
                  </Label>
                  <Select value={staffId || 'any'} onValueChange={(v) => setStaffId(v === 'any' ? '' : v)}>
                    <SelectTrigger>
                      <SelectValue placeholder="Any available" />
                    </SelectTrigger>
                    <SelectContent>
                      <SelectItem value="any">Any available</SelectItem>
                      {catalog?.staff?.map((s) => (
                        <SelectItem key={s.id} value={s.id}>
                          {s.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </>
            )}
            
            {/* Date Selection */}
            <div className="space-y-2">
              <Label>Date</Label>
              <Calendar
                mode="single"
                selected={date}
                onSelect={setDate}
                disabled={(d) => d < new Date(new Date().setHours(0, 0, 0, 0))}
                className="rounded-md border"
              />
            </div>
            
            {/* Notes */}
            <div className="space-y-2">
              <Label>Notes (optional)</Label>
              <Input
                placeholder="Special requests..."
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
              />
            </div>
            
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={() => setStep('time')} 
                disabled={!canProceedToTime}
                className="flex-1"
              >
                Select Time
              </Button>
            </div>
          </div>
        ) : (
          <div className="space-y-4 py-4">
            <div className="text-sm text-muted-foreground mb-4">
              {date && format(date, 'EEEE, MMMM d, yyyy')}
            </div>
            
            {availLoading ? (
              <div className="flex justify-center py-8">
                <Loader2 className="h-6 w-6 animate-spin text-primary" />
              </div>
            ) : slots.length === 0 ? (
              <div className="text-center py-8 text-muted-foreground">
                No available times for this date
              </div>
            ) : (
              <div className="grid grid-cols-4 gap-2 max-h-[300px] overflow-y-auto">
                {slots.map((slot, i) => (
                  <button
                    key={i}
                    onClick={() => setSelectedTime(slot.start_time)}
                    className={`py-2 px-3 rounded-lg text-sm font-medium transition-all ${
                      selectedTime === slot.start_time
                        ? 'bg-primary text-primary-foreground'
                        : 'bg-muted hover:bg-primary/10'
                    }`}
                  >
                    {formatTime(slot.start_time)}
                  </button>
                ))}
              </div>
            )}
            
            <div className="flex gap-3 pt-4">
              <Button variant="outline" onClick={() => setStep('details')} className="flex-1">
                Back
              </Button>
              <Button 
                onClick={() => createMutation.mutate()} 
                disabled={!selectedTime || createMutation.isPending}
                className="flex-1"
              >
                {createMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 animate-spin mr-2" />
                    Creating...
                  </>
                ) : (
                  'Create Booking'
                )}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

