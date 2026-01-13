import { useMemo } from 'react';
import type { Booking } from '@/lib/api';
import { formatTime, getDateString } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { format, isToday, isSameDay } from 'date-fns';
import { Users, Sparkles, ChevronRight } from 'lucide-react';

interface WeekViewProps {
  weekDates: Date[];
  bookingsByDate: Record<string, Booking[]>;
  businessType: 'restaurant' | 'spa';
  hours: Array<{
    day_of_week: number;
    open_time: string;
    close_time: string;
    is_closed: boolean;
  }>;
  businessId: string;
  onSelectDate: (date: Date) => void;
}

export function WeekView({ 
  weekDates, 
  bookingsByDate, 
  businessType,
  hours,
  onSelectDate
}: WeekViewProps) {
  // Generate time slots (simplified, every hour from 9 to 9)
  const timeSlots = useMemo(() => {
    const slots: string[] = [];
    for (let hour = 9; hour <= 21; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
    }
    return slots;
  }, []);
  
  const getDayHours = (date: Date) => {
    const dayOfWeek = date.getDay();
    return hours.find(h => h.day_of_week === dayOfWeek);
  };
  
  // Get bookings for a specific time slot on a specific day
  const getBookingsForSlot = (date: Date, slotTime: string) => {
    const dateStr = getDateString(date);
    const dayBookings = bookingsByDate[dateStr] || [];
    
    const slotHour = parseInt(slotTime.split(':')[0]);
    
    return dayBookings.filter(booking => {
      if (booking.status !== 'confirmed') return false;
      const bookingHour = parseInt(booking.start_time.split(':')[0]);
      return bookingHour === slotHour;
    });
  };
  
  // Count bookings per day for summary
  const getBookingCount = (date: Date) => {
    const dateStr = getDateString(date);
    const dayBookings = bookingsByDate[dateStr] || [];
    return dayBookings.filter(b => b.status === 'confirmed').length;
  };
  
  return (
    <div className="border rounded-xl bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-[900px]">
          {/* Header row with day names */}
          <div className="flex border-b sticky top-0 bg-card z-10">
            <div className="w-16 flex-shrink-0 p-3 border-r bg-muted/30" />
            {weekDates.map((date) => {
              const dayHours = getDayHours(date);
              const bookingCount = getBookingCount(date);
              const isClosed = dayHours?.is_closed;
              
              return (
                <button
                  key={date.toISOString()}
                  onClick={() => onSelectDate(date)}
                  className={cn(
                    "flex-1 min-w-[120px] p-3 border-r last:border-r-0 text-center transition-colors hover:bg-muted/30",
                    isToday(date) && "bg-primary/5"
                  )}
                >
                  <div className={cn(
                    "text-xs font-medium uppercase",
                    isToday(date) ? "text-primary" : "text-muted-foreground"
                  )}>
                    {format(date, 'EEE')}
                  </div>
                  <div className={cn(
                    "text-xl font-semibold",
                    isToday(date) && "text-primary"
                  )}>
                    {format(date, 'd')}
                  </div>
                  {isClosed ? (
                    <div className="text-xs text-muted-foreground mt-1">Closed</div>
                  ) : bookingCount > 0 ? (
                    <div className="text-xs text-primary mt-1 font-medium">
                      {bookingCount} booking{bookingCount > 1 ? 's' : ''}
                    </div>
                  ) : null}
                </button>
              );
            })}
          </div>
          
          {/* Time grid */}
          <div className="flex">
            {/* Time column */}
            <div className="w-16 flex-shrink-0 border-r bg-muted/30">
              {timeSlots.map((time) => (
                <div 
                  key={time} 
                  className="h-16 px-2 flex items-start pt-1 text-xs text-muted-foreground font-medium"
                >
                  {formatTime(time)}
                </div>
              ))}
            </div>
            
            {/* Day columns */}
            {weekDates.map((date) => {
              const dayHours = getDayHours(date);
              const isClosed = dayHours?.is_closed;
              
              return (
                <div 
                  key={date.toISOString()} 
                  className={cn(
                    "flex-1 min-w-[120px] border-r last:border-r-0 relative",
                    isClosed && "bg-muted/20"
                  )}
                >
                  {/* Grid lines */}
                  {timeSlots.map((time) => (
                    <div 
                      key={time} 
                      className="h-16 border-b last:border-b-0 border-border/50"
                    />
                  ))}
                  
                  {/* Closed overlay */}
                  {isClosed && (
                    <div className="absolute inset-0 flex items-center justify-center">
                      <span className="text-xs text-muted-foreground bg-muted px-2 py-1 rounded">
                        Closed
                      </span>
                    </div>
                  )}
                  
                  {/* Bookings */}
                  {!isClosed && timeSlots.map((slotTime) => {
                    const slotBookings = getBookingsForSlot(date, slotTime);
                    if (slotBookings.length === 0) return null;
                    
                    const slotIndex = timeSlots.indexOf(slotTime);
                    
                    return slotBookings.slice(0, 2).map((booking, idx) => (
                      <div
                        key={booking.id}
                        className={cn(
                          "absolute left-1 right-1 rounded-md px-1.5 py-0.5 text-[10px] cursor-pointer transition-all hover:shadow-md",
                          "bg-primary/90 text-primary-foreground"
                        )}
                        style={{
                          top: `${slotIndex * 64 + 4 + idx * 24}px`,
                          height: '20px',
                        }}
                        title={`${booking.customer_name} - ${formatTime(booking.start_time)}`}
                        onClick={(e) => {
                          e.stopPropagation();
                          onSelectDate(date);
                        }}
                      >
                        <div className="truncate font-medium">
                          {booking.customer_name}
                          {businessType === 'restaurant' && booking.party_size && (
                            <span className="opacity-80 ml-1">({booking.party_size})</span>
                          )}
                        </div>
                      </div>
                    ));
                  })}
                  
                  {/* More indicator */}
                  {!isClosed && timeSlots.some(slotTime => {
                    const slotBookings = getBookingsForSlot(date, slotTime);
                    return slotBookings.length > 2;
                  }) && (
                    <button
                      onClick={() => onSelectDate(date)}
                      className="absolute bottom-2 left-1 right-1 text-center text-[10px] text-primary font-medium hover:underline"
                    >
                      View more <ChevronRight className="h-3 w-3 inline" />
                    </button>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

