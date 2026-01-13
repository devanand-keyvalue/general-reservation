import { useState } from 'react';
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Label } from '@/components/ui/label';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Loader2, ArrowRight, Table2, User } from 'lucide-react';
import { toast } from 'sonner';
import { getManagerTables, getManagerStaff } from '@/lib/api';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

interface Booking {
  id: string;
  customer_name: string;
  start_time: string;
  booking_assignments?: Array<{
    resource_type: string;
    resource_id: string;
  }>;
}

interface ReassignModalProps {
  businessId: string;
  businessType: 'restaurant' | 'spa';
  booking: Booking | null;
  isOpen: boolean;
  onClose: () => void;
  onSuccess: () => void;
}

export function ReassignModal({
  businessId,
  businessType,
  booking,
  isOpen,
  onClose,
  onSuccess,
}: ReassignModalProps) {
  const queryClient = useQueryClient();
  const [newResourceId, setNewResourceId] = useState('');
  
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
  
  const reassignMutation = useMutation({
    mutationFn: async () => {
      const resourceType = businessType === 'restaurant' ? 'table' : 'staff';
      const res = await fetch(`${API_BASE}/${businessId}/bookings/${booking?.id}/reassign`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          resource_id: newResourceId,
          resource_type: resourceType,
        }),
      });
      if (!res.ok) {
        const error = await res.json();
        throw new Error(error.error || 'Failed to reassign');
      }
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manager-bookings'] });
      toast.success('Booking reassigned successfully!');
      onSuccess();
      handleClose();
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });
  
  const handleClose = () => {
    setNewResourceId('');
    onClose();
  };
  
  const resources = businessType === 'restaurant' 
    ? (tablesData?.tables || [])
    : (staffData?.staff || []);
  
  const currentAssignment = booking?.booking_assignments?.find(
    a => a.resource_type === (businessType === 'restaurant' ? 'table' : 'staff')
  );
  
  const currentResource = resources.find(r => r.id === currentAssignment?.resource_id);
  
  const formatTime = (time: string) => {
    const [h, m] = time.split(':').map(Number);
    const period = h >= 12 ? 'PM' : 'AM';
    const hour = h % 12 || 12;
    return `${hour}:${m.toString().padStart(2, '0')} ${period}`;
  };
  
  return (
    <Dialog open={isOpen} onOpenChange={(open) => !open && handleClose()}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <ArrowRight className="h-5 w-5" />
            Reassign {businessType === 'restaurant' ? 'Table' : 'Staff'}
          </DialogTitle>
          <DialogDescription>
            Move this booking to a different {businessType === 'restaurant' ? 'table' : 'staff member'}
          </DialogDescription>
        </DialogHeader>
        
        {booking && (
          <div className="space-y-4 py-4">
            {/* Booking info */}
            <div className="p-3 bg-muted rounded-lg">
              <p className="font-medium">{booking.customer_name}</p>
              <p className="text-sm text-muted-foreground">
                {formatTime(booking.start_time)}
              </p>
              {currentResource && (
                <p className="text-sm mt-1">
                  Currently: <span className="font-medium">{currentResource.name}</span>
                </p>
              )}
            </div>
            
            {/* New resource selection */}
            <div className="space-y-2">
              <Label className="flex items-center gap-2">
                {businessType === 'restaurant' ? (
                  <Table2 className="h-4 w-4" />
                ) : (
                  <User className="h-4 w-4" />
                )}
                New {businessType === 'restaurant' ? 'Table' : 'Staff Member'}
              </Label>
              <Select value={newResourceId} onValueChange={setNewResourceId}>
                <SelectTrigger>
                  <SelectValue placeholder={`Select ${businessType === 'restaurant' ? 'table' : 'staff'}...`} />
                </SelectTrigger>
                <SelectContent>
                  {resources
                    .filter(r => r.id !== currentAssignment?.resource_id)
                    .map((r) => (
                      <SelectItem key={r.id} value={r.id}>
                        {r.name}
                        {businessType === 'restaurant' && 'capacity' in r && ` (${(r as { capacity: number }).capacity} seats)`}
                      </SelectItem>
                    ))}
                </SelectContent>
              </Select>
            </div>
            
            <div className="flex gap-3 pt-2">
              <Button variant="outline" onClick={handleClose} className="flex-1">
                Cancel
              </Button>
              <Button 
                onClick={() => reassignMutation.mutate()} 
                disabled={!newResourceId || reassignMutation.isPending}
                className="flex-1"
              >
                {reassignMutation.isPending ? (
                  <Loader2 className="h-4 w-4 animate-spin mr-2" />
                ) : (
                  <ArrowRight className="h-4 w-4 mr-2" />
                )}
                Reassign
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

