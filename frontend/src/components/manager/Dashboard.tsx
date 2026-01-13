import { useState } from 'react';
import { useQuery, useQueries } from '@tanstack/react-query';
import { getCatalog, getManagerBookings, getManagerTables, getManagerStaff } from '@/lib/api';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Button } from '@/components/ui/button';
import { Calendar } from '@/components/ui/calendar';
import { TimelineView } from './TimelineView';
import { ListView } from './ListView';
import { WeekView } from './WeekView';
import { SettingsPanel } from './SettingsPanel';
import { CreateBookingModal } from './CreateBookingModal';
import { BlockSlotsModal } from './BlockSlotsModal';
import { getDateString } from '@/lib/utils';
import { 
  LayoutGrid, 
  List, 
  ChevronLeft, 
  ChevronRight, 
  CalendarDays,
  Loader2,
  Settings,
  Utensils,
  Sparkles,
  Plus,
  Ban,
  Calendar as CalendarIcon
} from 'lucide-react';
import { addDays, startOfWeek, format } from 'date-fns';

interface DashboardProps {
  businessId: string;
}

export function Dashboard({ businessId }: DashboardProps) {
  const [selectedDate, setSelectedDate] = useState(new Date());
  const [view, setView] = useState<'day' | 'week' | 'list'>('day');
  const [showCalendar, setShowCalendar] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showCreateBooking, setShowCreateBooking] = useState(false);
  const [showBlockSlots, setShowBlockSlots] = useState(false);
  
  const dateString = getDateString(selectedDate);
  
  // For week view, generate an array of dates for the week
  const weekStart = startOfWeek(selectedDate, { weekStartsOn: 0 });
  const weekDates = Array.from({ length: 7 }, (_, i) => addDays(weekStart, i));
  
  const { data: catalog, isLoading: catalogLoading } = useQuery({
    queryKey: ['catalog', businessId],
    queryFn: () => getCatalog(businessId),
  });
  
  const { data: bookingsData, isLoading: bookingsLoading, refetch } = useQuery({
    queryKey: ['manager-bookings', businessId, dateString],
    queryFn: () => getManagerBookings(businessId, dateString),
  });
  
  const { data: tablesData } = useQuery({
    queryKey: ['manager-tables', businessId],
    queryFn: () => getManagerTables(businessId),
    enabled: catalog?.business.type === 'restaurant',
  });
  
  const { data: staffData } = useQuery({
    queryKey: ['manager-staff', businessId],
    queryFn: () => getManagerStaff(businessId),
    enabled: catalog?.business.type === 'spa',
  });
  
  const goToPrev = () => setSelectedDate(d => addDays(d, view === 'week' ? -7 : -1));
  const goToNext = () => setSelectedDate(d => addDays(d, view === 'week' ? 7 : 1));
  const goToToday = () => setSelectedDate(new Date());
  
  // Fetch bookings for week view (all 7 days)
  const weekBookingsQueries = useQueries({
    queries: view === 'week' 
      ? weekDates.map(date => ({
          queryKey: ['manager-bookings', businessId, getDateString(date)],
          queryFn: () => getManagerBookings(businessId, getDateString(date)),
        }))
      : [],
  });
  
  const weekBookings = weekBookingsQueries.reduce((acc, query, index) => {
    if (query.data?.bookings) {
      acc[getDateString(weekDates[index])] = query.data.bookings;
    }
    return acc;
  }, {} as Record<string, any[]>);
  
  if (catalogLoading) {
    return (
      <div className="flex items-center justify-center min-h-screen">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  const business = catalog?.business;
  const isRestaurant = business?.type === 'restaurant';
  const resources = isRestaurant ? tablesData?.tables : staffData?.staff;
  
  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="border-b bg-card sticky top-0 z-40">
        <div className="container mx-auto px-4">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-3">
              {isRestaurant ? (
                <Utensils className="h-6 w-6 text-primary" />
              ) : (
                <Sparkles className="h-6 w-6 text-primary" />
              )}
              <h1 className="font-display text-xl font-semibold">{business?.name}</h1>
              <span className="px-2 py-0.5 bg-primary/10 text-primary text-xs rounded-full font-medium capitalize">
                {business?.type}
              </span>
            </div>
            <div className="flex items-center gap-2">
              <Button onClick={() => setShowCreateBooking(true)} size="sm">
                <Plus className="h-4 w-4 mr-1" />
                New Booking
              </Button>
              <Button variant="outline" size="sm" onClick={() => setShowBlockSlots(true)}>
                <Ban className="h-4 w-4 mr-1" />
                Block Time
              </Button>
              <Button variant="ghost" size="icon" onClick={() => setShowSettings(true)}>
                <Settings className="h-5 w-5" />
              </Button>
            </div>
          </div>
        </div>
      </header>
      
      {/* Toolbar */}
      <div className="border-b bg-card">
        <div className="container mx-auto px-4 py-3">
          <div className="flex items-center justify-between flex-wrap gap-3">
            {/* Date navigation */}
            <div className="flex items-center gap-2">
              <Button variant="outline" size="icon" onClick={goToPrev}>
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <div className="relative">
                <Button 
                  variant="outline" 
                  className="min-w-[200px] justify-start"
                  onClick={() => setShowCalendar(!showCalendar)}
                >
                  <CalendarDays className="h-4 w-4 mr-2" />
                  {view === 'week' 
                    ? `${format(weekStart, 'MMM d')} - ${format(addDays(weekStart, 6), 'MMM d, yyyy')}`
                    : format(selectedDate, 'EEEE, MMMM d, yyyy')
                  }
                </Button>
                {showCalendar && (
                  <div className="absolute top-full left-0 mt-1 bg-card border rounded-xl shadow-xl z-50">
                    <Calendar
                      mode="single"
                      selected={selectedDate}
                      onSelect={(date) => {
                        if (date) {
                          setSelectedDate(date);
                          setShowCalendar(false);
                        }
                      }}
                    />
                  </div>
                )}
              </div>
              <Button variant="outline" size="icon" onClick={goToNext}>
                <ChevronRight className="h-4 w-4" />
              </Button>
              <Button variant="ghost" size="sm" onClick={goToToday}>
                Today
              </Button>
            </div>
            
            {/* View toggle */}
            <div className="flex items-center gap-2">
              <Tabs value={view} onValueChange={(v) => setView(v as 'day' | 'week' | 'list')}>
                <TabsList>
                  <TabsTrigger value="day" className="flex items-center gap-1">
                    <LayoutGrid className="h-4 w-4" />
                    <span className="hidden sm:inline">Day</span>
                  </TabsTrigger>
                  <TabsTrigger value="week" className="flex items-center gap-1">
                    <CalendarIcon className="h-4 w-4" />
                    <span className="hidden sm:inline">Week</span>
                  </TabsTrigger>
                  <TabsTrigger value="list" className="flex items-center gap-1">
                    <List className="h-4 w-4" />
                    <span className="hidden sm:inline">List</span>
                  </TabsTrigger>
                </TabsList>
              </Tabs>
            </div>
          </div>
        </div>
      </div>
      
      {/* Content */}
      <main className="container mx-auto px-4 py-6">
        {bookingsLoading && view === 'day' ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-8 w-8 animate-spin text-primary" />
          </div>
        ) : view === 'day' ? (
          <TimelineView 
            bookings={bookingsData?.bookings || []}
            resources={resources || []}
            businessType={business?.type || 'restaurant'}
            date={selectedDate}
            hours={catalog?.hours || []}
            businessId={businessId}
            onRefresh={refetch}
          />
        ) : view === 'week' ? (
          <WeekView
            weekDates={weekDates}
            bookingsByDate={weekBookings}
            businessType={business?.type || 'restaurant'}
            hours={catalog?.hours || []}
            businessId={businessId}
            onSelectDate={(date) => {
              setSelectedDate(date);
              setView('day');
            }}
          />
        ) : (
          <ListView 
            bookings={bookingsData?.bookings || []}
            businessId={businessId}
            businessType={business?.type || 'restaurant'}
            onRefresh={refetch}
          />
        )}
      </main>
      
      {/* Modals */}
      {showSettings && (
        <SettingsPanel 
          businessId={businessId}
          businessType={business?.type || 'restaurant'}
          onClose={() => setShowSettings(false)}
        />
      )}
      
      <CreateBookingModal
        businessId={businessId}
        businessType={business?.type || 'restaurant'}
        isOpen={showCreateBooking}
        onClose={() => setShowCreateBooking(false)}
        selectedDate={selectedDate}
      />
      
      <BlockSlotsModal
        businessId={businessId}
        businessType={business?.type || 'restaurant'}
        isOpen={showBlockSlots}
        onClose={() => setShowBlockSlots(false)}
      />
    </div>
  );
}

