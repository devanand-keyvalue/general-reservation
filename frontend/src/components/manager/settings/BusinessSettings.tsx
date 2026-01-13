import { useState, useEffect } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
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
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Switch } from '@/components/ui/switch';
import { Loader2, Save, Clock, Calendar, MessageSquare, Building2 } from 'lucide-react';
import { toast } from 'sonner';

const API_BASE = import.meta.env.VITE_API_URL || (import.meta.env.PROD ? '/api/v1' : 'http://localhost:3001/api/v1');

interface Business {
  id: string;
  name: string;
  type: 'restaurant' | 'spa';
  timezone: string;
  slot_interval: 15 | 30;
  max_booking_horizon_days: number;
  allow_same_day: boolean;
  same_day_cutoff_minutes: number;
  notes_enabled: boolean;
  sms_enabled: boolean;
}

interface BusinessHour {
  day_of_week: number;
  open_time: string;
  close_time: string;
  is_closed: boolean;
}

interface RestaurantConfig {
  seating_duration_minutes: number;
  buffer_minutes: number;
  max_party_size: number;
}

interface BusinessSettingsProps {
  businessId: string;
  businessType: 'restaurant' | 'spa';
}

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIMEZONES = [
  'America/New_York',
  'America/Chicago',
  'America/Denver',
  'America/Los_Angeles',
  'America/Phoenix',
  'Europe/London',
  'Europe/Paris',
  'Asia/Tokyo',
  'Australia/Sydney',
];

const TIMES = Array.from({ length: 48 }, (_, i) => {
  const hour = Math.floor(i / 2);
  const min = (i % 2) * 30;
  return `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
});

export function BusinessSettings({ businessId, businessType }: BusinessSettingsProps) {
  const queryClient = useQueryClient();
  
  // Fetch business config
  const { data: businessData, isLoading: businessLoading } = useQuery({
    queryKey: ['manager-business', businessId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/manager/${businessId}`);
      return res.json();
    },
  });
  
  // Fetch business hours
  const { data: hoursData, isLoading: hoursLoading } = useQuery({
    queryKey: ['manager-hours', businessId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/manager/${businessId}/hours`);
      return res.json();
    },
  });
  
  // Fetch restaurant config (if applicable)
  const { data: restaurantData } = useQuery({
    queryKey: ['manager-restaurant-config', businessId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/manager/${businessId}/restaurant-config`);
      if (!res.ok) return null;
      return res.json();
    },
    enabled: businessType === 'restaurant',
  });
  
  const business: Business | null = businessData?.business || null;
  const hours: BusinessHour[] = hoursData?.hours || [];
  const restaurantConfig: RestaurantConfig | null = restaurantData?.config || null;
  
  // Local state for editing - initialized only once
  const [formData, setFormData] = useState<Partial<Business>>({});
  const [hoursFormData, setHoursFormData] = useState<BusinessHour[]>([]);
  const [restaurantFormData, setRestaurantFormData] = useState<Partial<RestaurantConfig>>({});
  const [initialized, setInitialized] = useState(false);
  
  useEffect(() => {
    if (business && !initialized) {
      setFormData({
        name: business.name,
        timezone: business.timezone,
        slot_interval: business.slot_interval,
        max_booking_horizon_days: business.max_booking_horizon_days,
        allow_same_day: business.allow_same_day,
        same_day_cutoff_minutes: business.same_day_cutoff_minutes,
        notes_enabled: business.notes_enabled,
        sms_enabled: business.sms_enabled,
      });
      
      if (hours.length > 0) {
        setHoursFormData(hours);
      } else {
        // Initialize default hours
        setHoursFormData(DAYS.map((_, i) => ({
          day_of_week: i,
          open_time: '09:00',
          close_time: '17:00',
          is_closed: i === 0, // Sunday closed by default
        })));
      }
      
      if (restaurantConfig) {
        setRestaurantFormData(restaurantConfig);
      }
      
      setInitialized(true);
    }
  }, [business, hours, restaurantConfig, initialized]);
  
  // Update mutations
  const updateBusinessMutation = useMutation({
    mutationFn: async (updates: Partial<Business>) => {
      const res = await fetch(`${API_BASE}/manager/${businessId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(updates),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manager-business', businessId] });
      queryClient.invalidateQueries({ queryKey: ['catalog', businessId] });
      toast.success('Business settings saved!');
    },
    onError: () => {
      toast.error('Failed to save settings');
    },
  });
  
  const updateHoursMutation = useMutation({
    mutationFn: async (hours: BusinessHour[]) => {
      const res = await fetch(`${API_BASE}/manager/${businessId}/hours`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hours }),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manager-hours', businessId] });
      queryClient.invalidateQueries({ queryKey: ['catalog', businessId] });
      toast.success('Business hours saved!');
    },
    onError: () => {
      toast.error('Failed to save hours');
    },
  });
  
  const updateRestaurantConfigMutation = useMutation({
    mutationFn: async (config: Partial<RestaurantConfig>) => {
      const res = await fetch(`${API_BASE}/manager/${businessId}/restaurant-config`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(config),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manager-restaurant-config', businessId] });
      queryClient.invalidateQueries({ queryKey: ['catalog', businessId] });
      toast.success('Restaurant settings saved!');
    },
    onError: () => {
      toast.error('Failed to save restaurant settings');
    },
  });
  
  const handleSaveGeneral = () => {
    updateBusinessMutation.mutate(formData);
  };
  
  const handleSaveHours = () => {
    updateHoursMutation.mutate(hoursFormData);
  };
  
  const handleSaveRestaurant = () => {
    updateRestaurantConfigMutation.mutate(restaurantFormData);
  };
  
  const updateHourForDay = (dayIndex: number, field: keyof BusinessHour, value: any) => {
    setHoursFormData(prev => prev.map((h, i) => 
      i === dayIndex ? { ...h, [field]: value } : h
    ));
  };
  
  const formatTime = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
  };
  
  if (businessLoading || hoursLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      {/* General Settings */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Building2 className="h-5 w-5" />
            General Settings
          </CardTitle>
          <CardDescription>Configure your business details and booking preferences</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label htmlFor="name">Business Name</Label>
              <Input
                id="name"
                value={formData.name || ''}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="timezone">Timezone</Label>
              <Select
                value={formData.timezone}
                onValueChange={(v) => setFormData({ ...formData, timezone: v })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMEZONES.map((tz) => (
                    <SelectItem key={tz} value={tz}>{tz}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="slot_interval">Slot Interval</Label>
              <Select
                value={formData.slot_interval?.toString()}
                onValueChange={(v) => setFormData({ ...formData, slot_interval: parseInt(v) as 15 | 30 })}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="15">15 minutes</SelectItem>
                  <SelectItem value="30">30 minutes</SelectItem>
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="max_horizon">Max Booking Horizon (days)</Label>
              <Input
                id="max_horizon"
                type="number"
                min="1"
                max="365"
                value={formData.max_booking_horizon_days || 30}
                onChange={(e) => setFormData({ ...formData, max_booking_horizon_days: parseInt(e.target.value) })}
              />
            </div>
          </div>
          
          <div className="space-y-4 pt-4 border-t">
            <div className="flex items-center justify-between">
              <div>
                <Label>Allow Same-Day Bookings</Label>
                <p className="text-sm text-muted-foreground">Allow customers to book for today</p>
              </div>
              <Switch
                checked={formData.allow_same_day}
                onCheckedChange={(v) => setFormData({ ...formData, allow_same_day: v })}
              />
            </div>
            
            {formData.allow_same_day && (
              <div className="space-y-2 pl-4 border-l-2">
                <Label>Cutoff Time (minutes before)</Label>
                <Input
                  type="number"
                  min="0"
                  max="480"
                  value={formData.same_day_cutoff_minutes || 60}
                  onChange={(e) => setFormData({ ...formData, same_day_cutoff_minutes: parseInt(e.target.value) })}
                  className="w-32"
                />
              </div>
            )}
            
            <div className="flex items-center justify-between">
              <div>
                <Label>Enable Notes</Label>
                <p className="text-sm text-muted-foreground">Allow customers to add special requests</p>
              </div>
              <Switch
                checked={formData.notes_enabled}
                onCheckedChange={(v) => setFormData({ ...formData, notes_enabled: v })}
              />
            </div>
            
            <div className="flex items-center justify-between">
              <div>
                <Label className="flex items-center gap-2">
                  <MessageSquare className="h-4 w-4" />
                  SMS Notifications
                </Label>
                <p className="text-sm text-muted-foreground">Send SMS confirmations and reminders</p>
              </div>
              <Switch
                checked={formData.sms_enabled}
                onCheckedChange={(v) => setFormData({ ...formData, sms_enabled: v })}
              />
            </div>
          </div>
          
          <Button 
            onClick={handleSaveGeneral} 
            disabled={updateBusinessMutation.isPending}
            className="mt-4"
          >
            {updateBusinessMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save General Settings
          </Button>
        </CardContent>
      </Card>
      
      {/* Business Hours */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Clock className="h-5 w-5" />
            Business Hours
          </CardTitle>
          <CardDescription>Set your operating hours for each day of the week</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-3">
            {DAYS.map((day, index) => {
              const dayHours = hoursFormData[index];
              if (!dayHours) return null;
              
              return (
                <div key={day} className="flex items-center gap-4 py-2 border-b last:border-0">
                  <div className="w-24 font-medium">{day}</div>
                  
                  <Switch
                    checked={!dayHours.is_closed}
                    onCheckedChange={(open) => updateHourForDay(index, 'is_closed', !open)}
                  />
                  
                  {!dayHours.is_closed ? (
                    <div className="flex items-center gap-2">
                      <Select
                        value={dayHours.open_time || '09:00'}
                        onValueChange={(v) => updateHourForDay(index, 'open_time', v)}
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue placeholder="Open">
                            {formatTime(dayHours.open_time || '09:00')}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {TIMES.map((t) => (
                            <SelectItem key={t} value={t}>{formatTime(t)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      <span className="text-muted-foreground">to</span>
                      <Select
                        value={dayHours.close_time || '17:00'}
                        onValueChange={(v) => updateHourForDay(index, 'close_time', v)}
                      >
                        <SelectTrigger className="w-28">
                          <SelectValue placeholder="Close">
                            {formatTime(dayHours.close_time || '17:00')}
                          </SelectValue>
                        </SelectTrigger>
                        <SelectContent>
                          {TIMES.map((t) => (
                            <SelectItem key={t} value={t}>{formatTime(t)}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ) : (
                    <span className="text-muted-foreground">Closed</span>
                  )}
                </div>
              );
            })}
          </div>
          
          <Button 
            onClick={handleSaveHours} 
            disabled={updateHoursMutation.isPending}
            className="mt-4"
          >
            {updateHoursMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Save className="h-4 w-4 mr-2" />
            )}
            Save Business Hours
          </Button>
        </CardContent>
      </Card>
      
      {/* Restaurant-specific settings */}
      {businessType === 'restaurant' && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center gap-2">
              <Calendar className="h-5 w-5" />
              Restaurant Settings
            </CardTitle>
            <CardDescription>Configure reservation-specific settings</CardDescription>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div className="space-y-2">
                <Label>Seating Duration (minutes)</Label>
                <Input
                  type="number"
                  min="30"
                  max="300"
                  value={restaurantFormData.seating_duration_minutes || 90}
                  onChange={(e) => setRestaurantFormData({ 
                    ...restaurantFormData, 
                    seating_duration_minutes: parseInt(e.target.value) 
                  })}
                />
                <p className="text-xs text-muted-foreground">How long each reservation occupies a table</p>
              </div>
              
              <div className="space-y-2">
                <Label>Buffer Time (minutes)</Label>
                <Input
                  type="number"
                  min="0"
                  max="60"
                  value={restaurantFormData.buffer_minutes || 0}
                  onChange={(e) => setRestaurantFormData({ 
                    ...restaurantFormData, 
                    buffer_minutes: parseInt(e.target.value) 
                  })}
                />
                <p className="text-xs text-muted-foreground">Time between reservations for cleanup</p>
              </div>
              
              <div className="space-y-2">
                <Label>Max Party Size</Label>
                <Input
                  type="number"
                  min="1"
                  max="50"
                  value={restaurantFormData.max_party_size || 12}
                  onChange={(e) => setRestaurantFormData({ 
                    ...restaurantFormData, 
                    max_party_size: parseInt(e.target.value) 
                  })}
                />
                <p className="text-xs text-muted-foreground">Maximum guests per reservation</p>
              </div>
            </div>
            
            <Button 
              onClick={handleSaveRestaurant} 
              disabled={updateRestaurantConfigMutation.isPending}
            >
              {updateRestaurantConfigMutation.isPending ? (
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
              ) : (
                <Save className="h-4 w-4 mr-2" />
              )}
              Save Restaurant Settings
            </Button>
          </CardContent>
        </Card>
      )}
    </div>
  );
}

