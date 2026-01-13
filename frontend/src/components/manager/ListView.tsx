import { useState } from 'react';
import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { Booking } from '@/lib/api';
import { cancelBooking, markNoShow } from '@/lib/api';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@/components/ui/dialog';
import { ReassignModal } from './ReassignModal';
import { formatTime, formatDate, maskPhone } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { 
  Calendar, 
  Clock, 
  Users, 
  Sparkles, 
  Phone, 
  MoreHorizontal,
  CheckCircle2,
  XCircle,
  AlertTriangle,
  Loader2,
  User,
  ArrowRight
} from 'lucide-react';

interface ListViewProps {
  bookings: Booking[];
  businessId: string;
  businessType: 'restaurant' | 'spa';
  onRefresh: () => void;
}

export function ListView({ bookings, businessId, businessType, onRefresh }: ListViewProps) {
  const [selectedBooking, setSelectedBooking] = useState<Booking | null>(null);
  const [actionType, setActionType] = useState<'cancel' | 'no_show' | null>(null);
  const [showReassign, setShowReassign] = useState(false);
  const [reassignBooking, setReassignBooking] = useState<Booking | null>(null);
  
  const queryClient = useQueryClient();
  
  const cancelMutation = useMutation({
    mutationFn: (bookingId: string) => cancelBooking(businessId, bookingId),
    onSuccess: () => {
      onRefresh();
      setSelectedBooking(null);
      setActionType(null);
    },
  });
  
  const noShowMutation = useMutation({
    mutationFn: (bookingId: string) => markNoShow(businessId, bookingId),
    onSuccess: () => {
      onRefresh();
      setSelectedBooking(null);
      setActionType(null);
    },
  });
  
  const handleAction = () => {
    if (!selectedBooking) return;
    
    if (actionType === 'cancel') {
      cancelMutation.mutate(selectedBooking.id);
    } else if (actionType === 'no_show') {
      noShowMutation.mutate(selectedBooking.id);
    }
  };
  
  const confirmedBookings = bookings.filter(b => b.status === 'confirmed');
  const cancelledBookings = bookings.filter(b => b.status === 'cancelled' || b.status === 'no_show');
  
  const StatusBadge = ({ status }: { status: string }) => (
    <span className={cn(
      "px-2 py-0.5 rounded-full text-xs font-medium inline-flex items-center gap-1",
      status === 'confirmed' && "bg-accent/10 text-accent",
      status === 'cancelled' && "bg-muted text-muted-foreground",
      status === 'no_show' && "bg-destructive/10 text-destructive"
    )}>
      {status === 'confirmed' && <CheckCircle2 className="h-3 w-3" />}
      {status === 'cancelled' && <XCircle className="h-3 w-3" />}
      {status === 'no_show' && <AlertTriangle className="h-3 w-3" />}
      <span className="capitalize">{status.replace('_', ' ')}</span>
    </span>
  );
  
  const BookingRow = ({ booking }: { booking: Booking }) => (
    <div className="flex items-center gap-4 p-4 border-b last:border-b-0 hover:bg-muted/30 transition-colors">
      {/* Time */}
      <div className="w-20 text-center">
        <div className="font-semibold">{formatTime(booking.start_time)}</div>
        <div className="text-xs text-muted-foreground">{formatTime(booking.end_time)}</div>
      </div>
      
      {/* Customer info */}
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2">
          <User className="h-4 w-4 text-muted-foreground" />
          <span className="font-medium truncate">{booking.customer_name}</span>
        </div>
        <div className="flex items-center gap-2 text-sm text-muted-foreground">
          <Phone className="h-3 w-3" />
          <span>{maskPhone(booking.customer_phone)}</span>
        </div>
      </div>
      
      {/* Details */}
      <div className="w-32 text-sm">
        {businessType === 'restaurant' ? (
          <div className="flex items-center gap-1">
            <Users className="h-4 w-4 text-primary" />
            <span>{booking.party_size} guests</span>
          </div>
        ) : (
          <div className="flex items-center gap-1">
            <Sparkles className="h-4 w-4 text-primary" />
            <span className="truncate">{booking.services?.name || 'Service'}</span>
          </div>
        )}
      </div>
      
      {/* Reference */}
      <div className="w-24 font-mono text-xs text-muted-foreground">
        {booking.reference}
      </div>
      
      {/* Status */}
      <div className="w-28">
        <StatusBadge status={booking.status} />
      </div>
      
      {/* Actions */}
      {booking.status === 'confirmed' && (
        <div className="flex gap-1">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setReassignBooking(booking);
              setShowReassign(true);
            }}
          >
            <ArrowRight className="h-3.5 w-3.5 mr-1" />
            Move
          </Button>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => {
              setSelectedBooking(booking);
              setActionType('no_show');
            }}
          >
            No-show
          </Button>
          <Button
            variant="ghost"
            size="sm"
            className="text-destructive hover:text-destructive"
            onClick={() => {
              setSelectedBooking(booking);
              setActionType('cancel');
            }}
          >
            Cancel
          </Button>
        </div>
      )}
    </div>
  );
  
  if (bookings.length === 0) {
    return (
      <div className="text-center py-20">
        <Calendar className="h-12 w-12 text-muted-foreground mx-auto mb-4" />
        <p className="text-muted-foreground">No bookings for this day</p>
      </div>
    );
  }
  
  return (
    <>
      <div className="border rounded-xl bg-card overflow-hidden">
        {/* Header */}
        <div className="flex items-center gap-4 p-4 bg-muted/30 border-b text-sm font-medium text-muted-foreground">
          <div className="w-20 text-center">Time</div>
          <div className="flex-1">Customer</div>
          <div className="w-32">{businessType === 'restaurant' ? 'Party' : 'Service'}</div>
          <div className="w-24">Reference</div>
          <div className="w-28">Status</div>
          <div className="w-32"></div>
        </div>
        
        {/* Confirmed bookings */}
        {confirmedBookings.length > 0 && (
          <div>
            {confirmedBookings.map(booking => (
              <BookingRow key={booking.id} booking={booking} />
            ))}
          </div>
        )}
        
        {/* Cancelled/No-show bookings */}
        {cancelledBookings.length > 0 && (
          <div className="bg-muted/10">
            <div className="px-4 py-2 text-xs font-medium text-muted-foreground border-b">
              Cancelled / No-shows
            </div>
            {cancelledBookings.map(booking => (
              <BookingRow key={booking.id} booking={booking} />
            ))}
          </div>
        )}
      </div>
      
      {/* Action confirmation dialog */}
      <Dialog open={!!actionType} onOpenChange={() => setActionType(null)}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2">
              {actionType === 'cancel' ? (
                <>
                  <XCircle className="h-5 w-5 text-destructive" />
                  Cancel Booking?
                </>
              ) : (
                <>
                  <AlertTriangle className="h-5 w-5 text-destructive" />
                  Mark as No-Show?
                </>
              )}
            </DialogTitle>
            <DialogDescription>
              {actionType === 'cancel' 
                ? 'Are you sure you want to cancel this booking? The customer will be notified.'
                : 'Mark this booking as a no-show? This will release the resources.'}
            </DialogDescription>
          </DialogHeader>
          
          {selectedBooking && (
            <div className="bg-muted/50 rounded-lg p-4 space-y-2">
              <div className="flex items-center gap-2">
                <User className="h-4 w-4 text-muted-foreground" />
                <span className="font-medium">{selectedBooking.customer_name}</span>
              </div>
              <div className="flex items-center gap-4 text-sm text-muted-foreground">
                <span className="flex items-center gap-1">
                  <Clock className="h-3 w-3" />
                  {formatTime(selectedBooking.start_time)}
                </span>
                {businessType === 'restaurant' ? (
                  <span className="flex items-center gap-1">
                    <Users className="h-3 w-3" />
                    {selectedBooking.party_size} guests
                  </span>
                ) : (
                  <span>{selectedBooking.services?.name}</span>
                )}
              </div>
            </div>
          )}
          
          <DialogFooter className="gap-2 sm:gap-0">
            <Button variant="outline" onClick={() => setActionType(null)}>
              Keep Booking
            </Button>
            <Button
              variant="destructive"
              onClick={handleAction}
              disabled={cancelMutation.isPending || noShowMutation.isPending}
            >
              {(cancelMutation.isPending || noShowMutation.isPending) && (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              )}
              {actionType === 'cancel' ? 'Cancel Booking' : 'Mark No-Show'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
      
      {/* Reassign Modal */}
      <ReassignModal
        businessId={businessId}
        businessType={businessType}
        booking={reassignBooking}
        isOpen={showReassign}
        onClose={() => {
          setShowReassign(false);
          setReassignBooking(null);
        }}
        onSuccess={onRefresh}
      />
    </>
  );
}

