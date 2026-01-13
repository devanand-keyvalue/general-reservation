import { useBookingStore } from '@/store/bookingStore';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Users, Clock, User } from 'lucide-react';
import type { CatalogResponse } from '@/lib/api';

interface SelectionStepProps {
  catalog: CatalogResponse;
}

export function SelectionStep({ catalog }: SelectionStepProps) {
  const { 
    business, 
    partySize, 
    setPartySize, 
    selectedService, 
    setSelectedService,
    selectedStaffId,
    setSelectedStaffId,
    setStep 
  } = useBookingStore();
  
  const isRestaurant = business?.type === 'restaurant';
  const maxPartySize = catalog.restaurant_config?.max_party_size || 12;
  
  const handleContinue = () => {
    if (isRestaurant && partySize > 0) {
      setStep('date');
    } else if (!isRestaurant && selectedService) {
      setStep('date');
    }
  };
  
  const canContinue = isRestaurant ? partySize > 0 : !!selectedService;
  
  return (
    <div className="space-y-6 animate-fade-in">
      {isRestaurant ? (
        // Restaurant: Party size selection
        <div className="space-y-3">
          <Label className="text-base flex items-center gap-2">
            <Users className="h-4 w-4 text-primary" />
            How many guests?
          </Label>
          <div className="grid grid-cols-4 gap-2">
            {Array.from({ length: Math.min(8, maxPartySize) }, (_, i) => i + 1).map((size) => (
              <Button
                key={size}
                variant={partySize === size ? 'default' : 'outline'}
                className="h-12 text-lg font-semibold"
                onClick={() => setPartySize(size)}
              >
                {size}
              </Button>
            ))}
          </div>
          {maxPartySize > 8 && (
            <Select
              value={partySize > 8 ? partySize.toString() : ''}
              onValueChange={(v) => setPartySize(parseInt(v))}
            >
              <SelectTrigger className="mt-2">
                <SelectValue placeholder="Larger party..." />
              </SelectTrigger>
              <SelectContent>
                {Array.from({ length: maxPartySize - 8 }, (_, i) => i + 9).map((size) => (
                  <SelectItem key={size} value={size.toString()}>
                    {size} guests
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          )}
        </div>
      ) : (
        // Spa: Service and staff selection
        <div className="space-y-5">
          <div className="space-y-3">
            <Label className="text-base">Select a service</Label>
            <div className="space-y-2 max-h-[250px] overflow-y-auto pr-1">
              {catalog.services?.map((service, index) => (
                <button
                  key={service.id}
                  onClick={() => setSelectedService(service)}
                  className={`w-full p-4 rounded-xl border-2 text-left transition-all duration-200 animate-fade-in stagger-${index + 1} ${
                    selectedService?.id === service.id
                      ? 'border-primary bg-primary/5 shadow-md'
                      : 'border-border hover:border-primary/50 hover:bg-muted/50'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-medium">{service.name}</span>
                    <span className="flex items-center gap-1 text-sm text-muted-foreground">
                      <Clock className="h-3.5 w-3.5" />
                      {service.duration_minutes} min
                    </span>
                  </div>
                </button>
              ))}
            </div>
          </div>
          
          {/* Staff preference (optional) */}
          {catalog.staff && catalog.staff.length > 0 && (
            <div className="space-y-2">
              <Label className="text-base flex items-center gap-2">
                <User className="h-4 w-4 text-primary" />
                Staff preference
                <span className="text-muted-foreground font-normal text-sm">(optional)</span>
              </Label>
              <Select
                value={selectedStaffId || 'any'}
                onValueChange={(v) => setSelectedStaffId(v === 'any' ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Any available" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="any">Any available</SelectItem>
                  {catalog.staff.map((staff) => (
                    <SelectItem key={staff.id} value={staff.id}>
                      {staff.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          )}
        </div>
      )}
      
      <Button 
        onClick={handleContinue} 
        disabled={!canContinue}
        className="w-full"
        size="lg"
      >
        Continue
      </Button>
    </div>
  );
}

