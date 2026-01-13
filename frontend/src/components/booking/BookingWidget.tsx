import { useEffect } from 'react';
import { useQuery } from '@tanstack/react-query';
import { getCatalog } from '@/lib/api';
import { useBookingStore } from '@/store/bookingStore';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { StepIndicator } from './StepIndicator';
import { SelectionStep } from './steps/SelectionStep';
import { DateStep } from './steps/DateStep';
import { TimeStep } from './steps/TimeStep';
import { DetailsStep } from './steps/DetailsStep';
import { ConfirmStep } from './steps/ConfirmStep';
import { SuccessStep } from './steps/SuccessStep';
import { Utensils, Sparkles, Loader2 } from 'lucide-react';

interface BookingWidgetProps {
  businessId: string;
}

export function BookingWidget({ businessId }: BookingWidgetProps) {
  const { step, business, setBusiness, setServices } = useBookingStore();
  
  const { data: catalog, isLoading, error } = useQuery({
    queryKey: ['catalog', businessId],
    queryFn: () => getCatalog(businessId),
  });
  
  useEffect(() => {
    if (catalog) {
      setBusiness(catalog.business);
      if (catalog.services) {
        setServices(catalog.services);
      }
    }
  }, [catalog, setBusiness, setServices]);
  
  if (isLoading) {
    return (
      <Card className="w-full max-w-lg mx-auto overflow-hidden">
        <CardContent className="flex items-center justify-center py-20">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }
  
  if (error || !catalog) {
    return (
      <Card className="w-full max-w-lg mx-auto overflow-hidden">
        <CardContent className="py-12 text-center">
          <p className="text-destructive">Failed to load booking information</p>
        </CardContent>
      </Card>
    );
  }
  
  const renderStep = () => {
    switch (step) {
      case 'selection':
        return <SelectionStep catalog={catalog} />;
      case 'date':
        return <DateStep />;
      case 'time':
        return <TimeStep businessId={businessId} />;
      case 'details':
        return <DetailsStep />;
      case 'confirm':
        return <ConfirmStep businessId={businessId} />;
      case 'success':
        return <SuccessStep />;
      default:
        return null;
    }
  };
  
  return (
    <Card className="w-full max-w-lg mx-auto overflow-hidden shadow-xl border-0">
      {/* Header with gradient */}
      <div className="relative bg-gradient-to-br from-primary via-primary to-accent p-6 text-primary-foreground">
        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxnIGZpbGw9IiNmZmZmZmYiIGZpbGwtb3BhY2l0eT0iMC4wNSI+PHBhdGggZD0iTTM2IDM0djItSDI0di0yaDEyek0zNiAzMHYySDI0di0yaDEyek0zNiAyNnYySDI0di0yaDEyeiIvPjwvZz48L2c+PC9zdmc+')] opacity-50" />
        <div className="relative">
          <div className="flex items-center gap-3 mb-2">
            {business?.type === 'restaurant' ? (
              <Utensils className="h-6 w-6" />
            ) : (
              <Sparkles className="h-6 w-6" />
            )}
            <CardTitle className="text-2xl text-white font-display">
              {business?.name}
            </CardTitle>
          </div>
          <p className="text-white/80 text-sm">
            {business?.type === 'restaurant' 
              ? 'Reserve your table' 
              : 'Book your appointment'}
          </p>
        </div>
      </div>
      
      {/* Step indicator */}
      {step !== 'success' && (
        <div className="px-6 pt-6">
          <StepIndicator />
        </div>
      )}
      
      {/* Content */}
      <CardContent className="p-6">
        {renderStep()}
      </CardContent>
    </Card>
  );
}

