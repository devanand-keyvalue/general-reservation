import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Clock, Loader2, Plus, Trash2 } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const TIMES = Array.from({ length: 28 }, (_, i) => {
  const hour = Math.floor(i / 2) + 7;
  const min = (i % 2) * 30;
  return `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
});

interface Staff {
  id: string;
  name: string;
}

interface Schedule {
  id: string;
  staff_id: string;
  day_of_week: number;
  start_time: string;
  end_time: string;
  is_available: boolean;
}

interface StaffScheduleManagerProps {
  businessId: string;
}

export function StaffScheduleManager({ businessId }: StaffScheduleManagerProps) {
  const [selectedStaffId, setSelectedStaffId] = useState<string>('');
  const [newSchedule, setNewSchedule] = useState({
    day_of_week: 1,
    start_time: '09:00',
    end_time: '17:00',
  });
  
  const queryClient = useQueryClient();
  
  const { data: staffData, isLoading: staffLoading } = useQuery({
    queryKey: ['manager-staff', businessId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/manager/${businessId}/staff`);
      return res.json();
    },
  });
  
  const { data: scheduleData, isLoading: scheduleLoading } = useQuery({
    queryKey: ['manager-schedules', businessId, selectedStaffId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/manager/${businessId}/staff/${selectedStaffId}/schedules`);
      return res.json();
    },
    enabled: !!selectedStaffId,
  });
  
  const addScheduleMutation = useMutation({
    mutationFn: async (schedule: typeof newSchedule) => {
      const res = await fetch(`${API_BASE}/manager/${businessId}/staff/${selectedStaffId}/schedules`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(schedule),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manager-schedules', businessId, selectedStaffId] });
    },
  });
  
  const deleteScheduleMutation = useMutation({
    mutationFn: async (scheduleId: string) => {
      await fetch(`${API_BASE}/manager/${businessId}/schedules/${scheduleId}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manager-schedules', businessId, selectedStaffId] });
    },
  });
  
  const staffList: Staff[] = staffData?.staff || [];
  const schedules: Schedule[] = scheduleData?.schedules || [];
  
  // Group schedules by day
  const schedulesByDay = schedules.reduce((acc, sch) => {
    if (!acc[sch.day_of_week]) acc[sch.day_of_week] = [];
    acc[sch.day_of_week].push(sch);
    return acc;
  }, {} as Record<number, Schedule[]>);
  
  const formatTime = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
  };
  
  if (staffLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-lg font-semibold">Staff Schedules</h3>
        <p className="text-sm text-muted-foreground">
          Configure weekly availability for each staff member
        </p>
      </div>
      
      {/* Staff selector */}
      <div className="space-y-2">
        <Label>Select Staff Member</Label>
        <Select value={selectedStaffId} onValueChange={setSelectedStaffId}>
          <SelectTrigger className="w-full max-w-xs">
            <SelectValue placeholder="Choose a staff member..." />
          </SelectTrigger>
          <SelectContent>
            {staffList.map((staff) => (
              <SelectItem key={staff.id} value={staff.id}>
                {staff.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>
      
      {selectedStaffId && (
        <>
          {/* Weekly schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Weekly Schedule</CardTitle>
            </CardHeader>
            <CardContent>
              {scheduleLoading ? (
                <div className="flex justify-center py-8">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              ) : (
                <div className="space-y-4">
                  {DAYS.map((day, dayIndex) => (
                    <div key={day} className="flex items-start gap-4 py-2 border-b last:border-0">
                      <div className="w-24 font-medium text-sm pt-2">{day}</div>
                      <div className="flex-1">
                        {schedulesByDay[dayIndex]?.length > 0 ? (
                          <div className="space-y-2">
                            {schedulesByDay[dayIndex].map((sch) => (
                              <div
                                key={sch.id}
                                className="flex items-center gap-2 bg-accent/10 text-accent px-3 py-2 rounded-lg text-sm"
                              >
                                <Clock className="h-4 w-4" />
                                {formatTime(sch.start_time)} - {formatTime(sch.end_time)}
                                <button
                                  onClick={() => deleteScheduleMutation.mutate(sch.id)}
                                  className="ml-auto hover:text-destructive transition-colors"
                                >
                                  <Trash2 className="h-4 w-4" />
                                </button>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <span className="text-sm text-muted-foreground">Off</span>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          
          {/* Add schedule */}
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Add Work Hours</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="flex flex-wrap items-end gap-4">
                <div className="space-y-2">
                  <Label>Day</Label>
                  <Select
                    value={newSchedule.day_of_week.toString()}
                    onValueChange={(v) => setNewSchedule({ ...newSchedule, day_of_week: parseInt(v) })}
                  >
                    <SelectTrigger className="w-36">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {DAYS.map((day, i) => (
                        <SelectItem key={i} value={i.toString()}>{day}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>Start Time</Label>
                  <Select
                    value={newSchedule.start_time}
                    onValueChange={(v) => setNewSchedule({ ...newSchedule, start_time: v })}
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMES.map((time) => (
                        <SelectItem key={time} value={time}>{formatTime(time)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <div className="space-y-2">
                  <Label>End Time</Label>
                  <Select
                    value={newSchedule.end_time}
                    onValueChange={(v) => setNewSchedule({ ...newSchedule, end_time: v })}
                  >
                    <SelectTrigger className="w-28">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {TIMES.map((time) => (
                        <SelectItem key={time} value={time}>{formatTime(time)}</SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                
                <Button
                  onClick={() => addScheduleMutation.mutate(newSchedule)}
                  disabled={addScheduleMutation.isPending}
                >
                  {addScheduleMutation.isPending ? (
                    <Loader2 className="h-4 w-4 animate-spin" />
                  ) : (
                    <>
                      <Plus className="h-4 w-4 mr-2" />
                      Add
                    </>
                  )}
                </Button>
              </div>
            </CardContent>
          </Card>
        </>
      )}
      
      {staffList.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            Add staff members first before configuring schedules.
          </CardContent>
        </Card>
      )}
    </div>
  );
}

