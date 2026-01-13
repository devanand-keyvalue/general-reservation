import { useMemo } from 'react';
import type { Booking, Table, Staff } from '@/lib/api';
import { formatTime } from '@/lib/utils';
import { cn } from '@/lib/utils';
import { Users, Sparkles, Clock, User } from 'lucide-react';

interface TimelineViewProps {
  bookings: Booking[];
  resources: (Table | Staff)[];
  businessType: 'restaurant' | 'spa';
  date: Date;
  hours: Array<{
    day_of_week: number;
    open_time: string;
    close_time: string;
    is_closed: boolean;
  }>;
  businessId: string;
  onRefresh: () => void;
}

export function TimelineView({ 
  bookings, 
  resources, 
  businessType,
  date,
  hours 
}: TimelineViewProps) {
  const dayOfWeek = date.getDay();
  const todayHours = hours.find(h => h.day_of_week === dayOfWeek);
  
  // Generate time slots
  const timeSlots = useMemo(() => {
    if (!todayHours || todayHours.is_closed) return [];
    
    const slots: string[] = [];
    const [startHour] = todayHours.open_time.split(':').map(Number);
    const [endHour] = todayHours.close_time.split(':').map(Number);
    
    for (let hour = startHour; hour <= endHour; hour++) {
      slots.push(`${hour.toString().padStart(2, '0')}:00`);
      if (hour < endHour) {
        slots.push(`${hour.toString().padStart(2, '0')}:30`);
      }
    }
    
    return slots;
  }, [todayHours]);
  
  // Map bookings to resources
  const bookingsByResource = useMemo(() => {
    const map = new Map<string, Booking[]>();
    
    resources.forEach(r => map.set(r.id, []));
    
    bookings.forEach(booking => {
      if (booking.status !== 'confirmed') return;
      
      booking.booking_assignments?.forEach(assignment => {
        const resourceType = businessType === 'restaurant' ? 'table' : 'staff';
        if (assignment.resource_type === resourceType) {
          const existing = map.get(assignment.resource_id) || [];
          existing.push(booking);
          map.set(assignment.resource_id, existing);
        }
      });
    });
    
    return map;
  }, [bookings, resources, businessType]);
  
  // Calculate booking position and height
  const getBookingStyle = (booking: Booking) => {
    const startMinutes = timeToMinutes(booking.start_time);
    const endMinutes = timeToMinutes(booking.end_time);
    const dayStartMinutes = timeToMinutes(timeSlots[0] || '09:00');
    
    const top = ((startMinutes - dayStartMinutes) / 30) * 48; // 48px per slot
    const height = ((endMinutes - startMinutes) / 30) * 48;
    
    return { top: `${top}px`, height: `${Math.max(height, 24)}px` };
  };
  
  const timeToMinutes = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    return h * 60 + m;
  };
  
  if (todayHours?.is_closed) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">Closed on this day</p>
      </div>
    );
  }
  
  if (resources.length === 0) {
    return (
      <div className="text-center py-20">
        <p className="text-muted-foreground">
          No {businessType === 'restaurant' ? 'tables' : 'staff'} configured
        </p>
      </div>
    );
  }
  
  return (
    <div className="border rounded-xl bg-card overflow-hidden">
      <div className="overflow-x-auto">
        <div className="min-w-[800px]">
          {/* Header row with resource names */}
          <div className="flex border-b sticky top-0 bg-card z-10">
            <div className="w-20 flex-shrink-0 p-3 border-r bg-muted/30">
              <Clock className="h-4 w-4 text-muted-foreground mx-auto" />
            </div>
            {resources.map((resource) => (
              <div 
                key={resource.id} 
                className="flex-1 min-w-[120px] p-3 border-r last:border-r-0 text-center"
              >
                <div className="font-medium text-sm">{resource.name}</div>
                {businessType === 'restaurant' && 'capacity' in resource && (
                  <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground mt-1">
                    <Users className="h-3 w-3" />
                    {resource.capacity}
                  </div>
                )}
              </div>
            ))}
          </div>
          
          {/* Time grid */}
          <div className="flex">
            {/* Time column */}
            <div className="w-20 flex-shrink-0 border-r bg-muted/30">
              {timeSlots.map((time, index) => (
                <div 
                  key={time} 
                  className={cn(
                    "h-12 px-2 flex items-center justify-end text-xs text-muted-foreground",
                    index % 2 === 0 ? "font-medium" : "text-muted-foreground/50"
                  )}
                >
                  {index % 2 === 0 ? formatTime(time) : ''}
                </div>
              ))}
            </div>
            
            {/* Resource columns */}
            {resources.map((resource) => (
              <div 
                key={resource.id} 
                className="flex-1 min-w-[120px] border-r last:border-r-0 relative"
              >
                {/* Grid lines */}
                {timeSlots.map((time, index) => (
                  <div 
                    key={time} 
                    className={cn(
                      "h-12 border-b last:border-b-0",
                      index % 2 === 0 ? "border-border" : "border-border/30"
                    )}
                  />
                ))}
                
                {/* Bookings */}
                {bookingsByResource.get(resource.id)?.map((booking) => (
                  <div
                    key={booking.id}
                    className={cn(
                      "absolute left-1 right-1 rounded-lg px-2 py-1 cursor-pointer transition-all hover:shadow-md hover:scale-[1.02]",
                      booking.status === 'confirmed' && "bg-primary/90 text-primary-foreground",
                      booking.status === 'no_show' && "bg-destructive/80 text-destructive-foreground"
                    )}
                    style={getBookingStyle(booking)}
                    title={`${booking.customer_name} - ${formatTime(booking.start_time)}`}
                  >
                    <div className="text-xs font-medium truncate">
                      {booking.customer_name}
                    </div>
                    <div className="text-[10px] opacity-80 flex items-center gap-1">
                      {businessType === 'restaurant' ? (
                        <>
                          <Users className="h-2.5 w-2.5" />
                          {booking.party_size}
                        </>
                      ) : (
                        <span className="truncate">
                          {booking.services?.name}
                        </span>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

