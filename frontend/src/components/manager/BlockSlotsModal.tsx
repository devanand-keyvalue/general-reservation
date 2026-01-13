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
import { Loader2, Ban, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { format } from 'date-fns';
import { createSlotBlock, getSlotBlocks, deleteSlotBlock, getManagerTables, getManagerStaff } from '@/lib/api';

interface BlockSlotsModalProps {
  businessId: string;
  businessType: 'restaurant' | 'spa';
  isOpen: boolean;
  onClose: () => void;
}

const TIMES = Array.from({ length: 28 }, (_, i) => {
  const hour = Math.floor(i / 2) + 7;
  const min = (i % 2) * 30;
  return `${hour.toString().padStart(2, '0')}:${min.toString().padStart(2, '0')}`;
});

export function BlockSlotsModal({
  businessId,
  businessType,
  isOpen,
  onClose,
}: BlockSlotsModalProps) {
  const queryClient = useQueryClient();
  
  const [date, setDate] = useState<Date | undefined>(new Date());
  const [startTime, setStartTime] = useState('09:00');
  const [endTime, setEndTime] = useState('17:00');
  const [resourceType, setResourceType] = useState<string>('');
  const [resourceId, setResourceId] = useState<string>('');
  const [reason, setReason] = useState('');
  
  const dateString = date ? format(date, 'yyyy-MM-dd') : '';
  
  // Fetch existing blocks
  const { data: blocksData, isLoading: blocksLoading } = useQuery({
    queryKey: ['blocks', businessId, dateString],
    queryFn: () => getSlotBlocks(businessId, dateString),
    enabled: isOpen && !!dateString,
  });
  
  // Fetch resources
  const { data: tablesData } = useQuery({
    queryKey: ['manager-tables', businessId],
    queryFn: () => getManagerTables(businessId),
    enabled: isOpen && businessType === 'restaurant',
  });
  
  const { data: staffData } = useQuery({
    queryKey: ['manager-staff', businessId],
    queryFn: () => getManagerStaff(businessId),
    enabled: isOpen && businessType === 'spa',
  });
  
  const createMutation = useMutation({
    mutationFn: () => createSlotBlock(businessId, {
      date: dateString,
      start_time: startTime,
      end_time: endTime,
      resource_type: resourceType || undefined,
      resource_id: resourceId || undefined,
      reason: reason || undefined,
    }),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocks', businessId] });
      queryClient.invalidateQueries({ queryKey: ['availability', businessId] });
      toast.success('Time blocked successfully!');
      setReason('');
      setResourceType('');
      setResourceId('');
    },
    onError: () => {
      toast.error('Failed to block time');
    },
  });
  
  const deleteMutation = useMutation({
    mutationFn: (blockId: string) => deleteSlotBlock(businessId, blockId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['blocks', businessId] });
      queryClient.invalidateQueries({ queryKey: ['availability', businessId] });
      toast.success('Block removed');
    },
    onError: () => {
      toast.error('Failed to remove block');
    },
  });
  
  const formatTime = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
  };
  
  const blocks = blocksData?.blocks || [];
  const tables = tablesData?.tables || [];
  const staff = staffData?.staff || [];
  
  const resources = businessType === 'restaurant' 
    ? tables.map(t => ({ id: t.id, name: t.name, type: 'table' }))
    : staff.map(s => ({ id: s.id, name: s.name, type: 'staff' }));
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="max-w-lg max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <Ban className="h-5 w-5" />
            Block Time Slots
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4 py-4">
          {/* Date Selection */}
          <div className="space-y-2">
            <Label>Date</Label>
            <Calendar
              mode="single"
              selected={date}
              onSelect={setDate}
              className="rounded-md border"
            />
          </div>
          
          {/* Time Range */}
          <div className="grid grid-cols-2 gap-4">
            <div className="space-y-2">
              <Label>Start Time</Label>
              <Select value={startTime} onValueChange={setStartTime}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMES.map((t) => (
                    <SelectItem key={t} value={t}>{formatTime(t)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="space-y-2">
              <Label>End Time</Label>
              <Select value={endTime} onValueChange={setEndTime}>
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {TIMES.map((t) => (
                    <SelectItem key={t} value={t}>{formatTime(t)}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
          
          {/* Resource Selection */}
          <div className="space-y-2">
            <Label>Apply to (optional)</Label>
            <Select 
              value={resourceId || 'all'} 
              onValueChange={(v) => {
                if (v === 'all') {
                  setResourceId('');
                  setResourceType('');
                } else {
                  const resource = resources.find(r => r.id === v);
                  setResourceId(v);
                  setResourceType(resource?.type || '');
                }
              }}
            >
              <SelectTrigger>
                <SelectValue placeholder="All resources (global block)" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All resources (global block)</SelectItem>
                {resources.map((r) => (
                  <SelectItem key={r.id} value={r.id}>{r.name}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
          
          {/* Reason */}
          <div className="space-y-2">
            <Label>Reason (optional)</Label>
            <Input
              placeholder="e.g., Private event, Maintenance"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
            />
          </div>
          
          <Button 
            onClick={() => createMutation.mutate()} 
            disabled={createMutation.isPending}
            className="w-full"
          >
            {createMutation.isPending ? (
              <Loader2 className="h-4 w-4 animate-spin mr-2" />
            ) : (
              <Ban className="h-4 w-4 mr-2" />
            )}
            Block Time
          </Button>
          
          {/* Existing blocks for selected date */}
          {blocks.length > 0 && (
            <div className="pt-4 border-t">
              <h4 className="font-medium mb-3">Existing Blocks for {dateString}</h4>
              <div className="space-y-2">
                {blocks.map((block: any) => (
                  <div 
                    key={block.id} 
                    className="flex items-center justify-between p-3 bg-destructive/10 rounded-lg"
                  >
                    <div>
                      <p className="font-medium">
                        {formatTime(block.start_time)} - {formatTime(block.end_time)}
                      </p>
                      <p className="text-sm text-muted-foreground">
                        {block.resource_id ? `Specific resource` : 'Global block'}
                        {block.reason && ` • ${block.reason}`}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => deleteMutation.mutate(block.id)}
                      disabled={deleteMutation.isPending}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
}

