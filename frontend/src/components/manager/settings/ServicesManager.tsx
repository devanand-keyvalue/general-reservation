import { useState } from 'react';
import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Card, CardContent } from '@/components/ui/card';
import { Plus, Pencil, Trash2, Clock, Loader2 } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

interface Service {
  id: string;
  name: string;
  duration_minutes: number;
  buffer_minutes: number;
  is_active: boolean;
}

interface ServicesManagerProps {
  businessId: string;
}

export function ServicesManager({ businessId }: ServicesManagerProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [editingService, setEditingService] = useState<Service | null>(null);
  const [formData, setFormData] = useState({ name: '', duration_minutes: 60, buffer_minutes: 0 });
  
  const queryClient = useQueryClient();
  
  const { data, isLoading } = useQuery({
    queryKey: ['manager-services', businessId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/manager/${businessId}/services`);
      return res.json();
    },
  });
  
  const createMutation = useMutation({
    mutationFn: async (service: Partial<Service>) => {
      const res = await fetch(`${API_BASE}/manager/${businessId}/services`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(service),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manager-services', businessId] });
      queryClient.invalidateQueries({ queryKey: ['catalog', businessId] });
      setShowDialog(false);
      resetForm();
    },
  });
  
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...service }: Partial<Service> & { id: string }) => {
      const res = await fetch(`${API_BASE}/manager/${businessId}/services/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(service),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manager-services', businessId] });
      queryClient.invalidateQueries({ queryKey: ['catalog', businessId] });
      setShowDialog(false);
      setEditingService(null);
      resetForm();
    },
  });
  
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`${API_BASE}/manager/${businessId}/services/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manager-services', businessId] });
      queryClient.invalidateQueries({ queryKey: ['catalog', businessId] });
    },
  });
  
  const resetForm = () => {
    setFormData({ name: '', duration_minutes: 60, buffer_minutes: 0 });
  };
  
  const handleEdit = (service: Service) => {
    setEditingService(service);
    setFormData({
      name: service.name,
      duration_minutes: service.duration_minutes,
      buffer_minutes: service.buffer_minutes,
    });
    setShowDialog(true);
  };
  
  const handleSubmit = () => {
    if (editingService) {
      updateMutation.mutate({ id: editingService.id, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };
  
  const services: Service[] = data?.services || [];
  
  if (isLoading) {
    return (
      <div className="flex justify-center py-12">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }
  
  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold">Services</h3>
          <p className="text-sm text-muted-foreground">
            Configure the services your spa offers
          </p>
        </div>
        <Button onClick={() => { resetForm(); setEditingService(null); setShowDialog(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Service
        </Button>
      </div>
      
      <Card>
        <CardContent className="p-0">
          <div className="divide-y">
            {services.map((service) => (
              <div key={service.id} className="flex items-center justify-between p-4">
                <div className="flex items-center gap-4">
                  <div className="w-10 h-10 rounded-lg bg-accent/10 flex items-center justify-center">
                    <Clock className="h-5 w-5 text-accent" />
                  </div>
                  <div>
                    <p className="font-medium">{service.name}</p>
                    <p className="text-sm text-muted-foreground">
                      {service.duration_minutes} min
                      {service.buffer_minutes > 0 && ` (+${service.buffer_minutes} min buffer)`}
                    </p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => handleEdit(service)}
                  >
                    <Pencil className="h-4 w-4" />
                  </Button>
                  <Button
                    variant="ghost"
                    size="icon"
                    className="text-destructive hover:text-destructive"
                    onClick={() => {
                      if (confirm('Delete this service?')) {
                        deleteMutation.mutate(service.id);
                      }
                    }}
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>
      
      {services.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No services configured. Add your first service to get started.
          </CardContent>
        </Card>
      )}
      
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingService ? 'Edit Service' : 'Add Service'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Service Name</Label>
              <Input
                id="name"
                placeholder="e.g., Swedish Massage"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="duration">Duration (minutes)</Label>
              <Input
                id="duration"
                type="number"
                min={15}
                max={240}
                step={15}
                value={formData.duration_minutes}
                onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) || 60 })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="buffer">Buffer Time (minutes)</Label>
              <Input
                id="buffer"
                type="number"
                min={0}
                max={60}
                step={5}
                value={formData.buffer_minutes}
                onChange={(e) => setFormData({ ...formData, buffer_minutes: parseInt(e.target.value) || 0 })}
              />
              <p className="text-xs text-muted-foreground">
                Time added after appointment for cleanup/preparation
              </p>
            </div>
          </div>
          
          <DialogFooter>
            <Button variant="outline" onClick={() => setShowDialog(false)}>
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={!formData.name || createMutation.isPending || updateMutation.isPending}
            >
              {(createMutation.isPending || updateMutation.isPending) && (
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              )}
              {editingService ? 'Save Changes' : 'Add Service'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

