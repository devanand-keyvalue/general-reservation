import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { getBooking, cancelBooking, getBookingsByPhone, getCatalog } from '@/lib/api';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { formatTime, formatDate } from '@/lib/utils';
import { 
  Calendar, 
  Clock, 
  Users, 
  Sparkles, 
  User, 
  Phone, 
  Loader2,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Search,
  ArrowLeft,
  ChevronRight
} from 'lucide-react';

interface ManageBookingProps {
  businessId: string;
  bookingId?: string;
}

export function ManageBooking({ businessId, bookingId: initialBookingId }: ManageBookingProps) {
  const [searchPhone, setSearchPhone] = useState('');
  const [searchRef, setSearchRef] = useState('');
  const [bookingId, setBookingId] = useState(initialBookingId || '');
  const [showCancelDialog, setShowCancelDialog] = useState(false);
  const [cancelled, setCancelled] = useState(false);
  const [searchSubmitted, setSearchSubmitted] = useState(false);
  
  const queryClient = useQueryClient();
  
  // Fetch catalog for business info
  const { data: catalogData } = useQuery({
    queryKey: ['catalog', businessId],
    queryFn: () => getCatalog(businessId),
  });
  
  // Search bookings by phone
  const { data: searchData, isLoading: searchLoading } = useQuery({
    queryKey: ['bookings-search', businessId, searchPhone],
    queryFn: () => getBookingsByPhone(businessId, searchPhone),
    enabled: searchSubmitted && !!searchPhone,
  });
  
  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['booking', businessId, bookingId],
    queryFn: () => getBooking(businessId, bookingId),
    enabled: !!bookingId,
  });
  
  const cancelMutation = useMutation({
    mutationFn: () => cancelBooking(businessId, bookingId),
    onSuccess: () => {
      setCancelled(true);
      setShowCancelDialog(false);
      queryClient.invalidateQueries({ queryKey: ['booking', businessId, bookingId] });
      queryClient.invalidateQueries({ queryKey: ['bookings-search', businessId] });
    },
  });
  
  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    if (searchPhone) {
      setSearchSubmitted(true);
    }
  };
  
  const handleSelectBooking = (id: string) => {
    setBookingId(id);
    setSearchSubmitted(false);
  };
  
  const handleBack = () => {
    setBookingId('');
    setSearchSubmitted(false);
  };
  
  const booking = data?.booking;
  const business = catalogData?.business;
  const searchResults = searchData?.bookings || [];
  const upcomingBookings = searchResults.filter(b => 
    b.status === 'confirmed' && new Date(b.booking_date) >= new Date(new Date().setHours(0, 0, 0, 0))
  );
  
  // Show search results if we have them
  if (searchSubmitted && !bookingId) {
    return (
      <Card className="w-full max-w-md mx-auto animate-fade-in">
        <CardHeader className="pb-3">
          <div className="flex items-center gap-2">
            <Button variant="ghost" size="icon" onClick={() => setSearchSubmitted(false)}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="font-display text-xl">Your Bookings</CardTitle>
          </div>
        </CardHeader>
        <CardContent>
          {searchLoading ? (
            <div className="flex justify-center py-8">
              <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
          ) : upcomingBookings.length === 0 ? (
            <div className="text-center py-8">
              <XCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
              <p className="text-muted-foreground">No upcoming bookings found</p>
              <Button 
                variant="link" 
                onClick={() => setSearchSubmitted(false)}
                className="mt-2"
              >
                Try a different phone number
              </Button>
            </div>
          ) : (
            <div className="space-y-3">
              {upcomingBookings.map((b) => (
                <button
                  key={b.id}
                  onClick={() => handleSelectBooking(b.id)}
                  className="w-full p-4 rounded-xl border-2 text-left transition-all hover:border-primary hover:bg-primary/5"
                >
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="font-medium">{formatDate(b.booking_date)}</p>
                      <p className="text-sm text-muted-foreground flex items-center gap-1">
                        <Clock className="h-3.5 w-3.5" />
                        {formatTime(b.start_time)}
                        {b.services && ` • ${b.services.name}`}
                        {b.party_size && ` • ${b.party_size} guests`}
                      </p>
                    </div>
                    <ChevronRight className="h-5 w-5 text-muted-foreground" />
                  </div>
                  <div className="mt-2 text-xs text-muted-foreground">
                    Ref: {b.reference}
                  </div>
                </button>
              ))}
            </div>
          )}
        </CardContent>
      </Card>
    );
  }
  
  if (!bookingId) {
    return (
      <Card className="w-full max-w-md mx-auto animate-fade-in">
        <CardHeader className="text-center pb-2">
          {business && (
            <p className="text-sm text-muted-foreground mb-1">{business.name}</p>
          )}
          <CardTitle className="font-display text-xl">Manage Your Booking</CardTitle>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSearch} className="space-y-4">
            <div className="space-y-2">
              <Label htmlFor="phone" className="flex items-center gap-2">
                <Phone className="h-4 w-4" />
                Phone Number
              </Label>
              <Input
                id="phone"
                type="tel"
                placeholder="Enter the phone number used when booking"
                value={searchPhone}
                onChange={(e) => setSearchPhone(e.target.value)}
              />
              <p className="text-xs text-muted-foreground">
                Enter the phone number you used when making your reservation
              </p>
            </div>
            <Button type="submit" className="w-full" disabled={!searchPhone}>
              <Search className="h-4 w-4 mr-2" />
              Find My Bookings
            </Button>
          </form>
        </CardContent>
      </Card>
    );
  }
  
  if (isLoading) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }
  
  if (error || !booking) {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="py-12 text-center">
          <XCircle className="h-12 w-12 text-destructive mx-auto mb-4" />
          <p className="text-destructive font-medium">Booking not found</p>
          <Button 
            variant="link" 
            onClick={() => setBookingId('')}
            className="mt-2"
          >
            Try again
          </Button>
        </CardContent>
      </Card>
    );
  }
  
  if (cancelled || booking.status === 'cancelled') {
    return (
      <Card className="w-full max-w-md mx-auto">
        <CardContent className="py-12 text-center">
          <XCircle className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
          <h3 className="font-display text-xl font-semibold mb-2">Booking Cancelled</h3>
          <p className="text-muted-foreground">
            This booking has been cancelled.
          </p>
        </CardContent>
      </Card>
    );
  }
  
  return (
    <>
      <Card className="w-full max-w-md mx-auto animate-fade-in">
        <CardHeader className="pb-4">
          <div className="flex items-center gap-3">
            <Button variant="ghost" size="icon" onClick={handleBack}>
              <ArrowLeft className="h-4 w-4" />
            </Button>
            <CardTitle className="font-display text-xl flex-1">Your Booking</CardTitle>
            <span className={`px-3 py-1 rounded-full text-xs font-medium ${
              booking.status === 'confirmed' 
                ? 'bg-accent/10 text-accent' 
                : 'bg-muted text-muted-foreground'
            }`}>
              {booking.status === 'confirmed' && (
                <span className="flex items-center gap-1">
                  <CheckCircle2 className="h-3 w-3" />
                  Confirmed
                </span>
              )}
            </span>
          </div>
        </CardHeader>
        <CardContent className="space-y-6">
          <div className="bg-muted/50 rounded-xl p-4 space-y-3">
            <div className="flex items-center justify-center gap-2 mb-4">
              <span className="text-sm text-muted-foreground">Reference:</span>
              <span className="font-mono font-bold">{booking.reference}</span>
            </div>
            
            <div className="grid grid-cols-2 gap-4">
              <div className="flex items-center gap-2">
                <Calendar className="h-4 w-4 text-primary" />
                <span className="text-sm">{formatDate(booking.booking_date).split(',')[0]}</span>
              </div>
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-primary" />
                <span className="text-sm">{formatTime(booking.start_time)}</span>
              </div>
            </div>
            
            {booking.party_size && (
              <div className="flex items-center gap-2">
                <Users className="h-4 w-4 text-primary" />
                <span className="text-sm">{booking.party_size} guests</span>
              </div>
            )}
            
            {booking.services && (
              <div className="flex items-center gap-2">
                <Sparkles className="h-4 w-4 text-primary" />
                <span className="text-sm">{booking.services.name}</span>
              </div>
            )}
          </div>
          
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-sm">
              <User className="h-4 w-4 text-muted-foreground" />
              <span>{booking.customer_name}</span>
            </div>
            <div className="flex items-center gap-2 text-sm">
              <Phone className="h-4 w-4 text-muted-foreground" />
              <span>{booking.customer_phone}</span>
            </div>
          </div>
          
          <div className="flex gap-3">
            <Button 
              variant="outline" 
              className="flex-1"
              onClick={() => setShowCancelDialog(true)}
            >
              Cancel Booking
            </Button>
          </div>
        </CardContent>
      </Card>
      
      <Dialog open={showCancelDialog} onOpenChange={setShowCancelDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-destructive" />
              Cancel Booking?
            </DialogTitle>
            <DialogDescription>
              Are you sure you want to cancel this booking? This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2 sm:gap-0">
            <Button
              variant="outline"
              onClick={() => setShowCancelDialog(false)}
            >
              Keep Booking
            </Button>
            <Button
              variant="destructive"
              onClick={() => cancelMutation.mutate()}
              disabled={cancelMutation.isPending}
            >
              {cancelMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : null}
              Yes, Cancel
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  );
}

