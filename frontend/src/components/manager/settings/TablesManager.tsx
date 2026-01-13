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
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Plus, Pencil, Trash2, Users, Loader2 } from 'lucide-react';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:3001/api/v1';

interface Table {
  id: string;
  name: string;
  capacity: number;
  zone: string | null;
  is_active: boolean;
}

interface TablesManagerProps {
  businessId: string;
}

export function TablesManager({ businessId }: TablesManagerProps) {
  const [showDialog, setShowDialog] = useState(false);
  const [editingTable, setEditingTable] = useState<Table | null>(null);
  const [formData, setFormData] = useState({ name: '', capacity: 2, zone: '' });
  
  const queryClient = useQueryClient();
  
  const { data, isLoading } = useQuery({
    queryKey: ['manager-tables', businessId],
    queryFn: async () => {
      const res = await fetch(`${API_BASE}/manager/${businessId}/tables`);
      return res.json();
    },
  });
  
  const createMutation = useMutation({
    mutationFn: async (table: Partial<Table>) => {
      const res = await fetch(`${API_BASE}/manager/${businessId}/tables`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(table),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manager-tables', businessId] });
      setShowDialog(false);
      resetForm();
    },
  });
  
  const updateMutation = useMutation({
    mutationFn: async ({ id, ...table }: Partial<Table> & { id: string }) => {
      const res = await fetch(`${API_BASE}/manager/${businessId}/tables/${id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(table),
      });
      return res.json();
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manager-tables', businessId] });
      setShowDialog(false);
      setEditingTable(null);
      resetForm();
    },
  });
  
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      await fetch(`${API_BASE}/manager/${businessId}/tables/${id}`, {
        method: 'DELETE',
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['manager-tables', businessId] });
    },
  });
  
  const resetForm = () => {
    setFormData({ name: '', capacity: 2, zone: '' });
  };
  
  const handleEdit = (table: Table) => {
    setEditingTable(table);
    setFormData({ name: table.name, capacity: table.capacity, zone: table.zone || '' });
    setShowDialog(true);
  };
  
  const handleSubmit = () => {
    if (editingTable) {
      updateMutation.mutate({ id: editingTable.id, ...formData });
    } else {
      createMutation.mutate(formData);
    }
  };
  
  const tables: Table[] = data?.tables || [];
  
  // Group by zone
  const tablesByZone = tables.reduce((acc, table) => {
    const zone = table.zone || 'Unassigned';
    if (!acc[zone]) acc[zone] = [];
    acc[zone].push(table);
    return acc;
  }, {} as Record<string, Table[]>);
  
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
          <h3 className="text-lg font-semibold">Tables</h3>
          <p className="text-sm text-muted-foreground">
            Manage your restaurant's tables and seating capacity
          </p>
        </div>
        <Button onClick={() => { resetForm(); setEditingTable(null); setShowDialog(true); }}>
          <Plus className="h-4 w-4 mr-2" />
          Add Table
        </Button>
      </div>
      
      {Object.entries(tablesByZone).map(([zone, zoneTables]) => (
        <Card key={zone}>
          <CardHeader className="py-3">
            <CardTitle className="text-base">{zone}</CardTitle>
          </CardHeader>
          <CardContent className="pt-0">
            <div className="divide-y">
              {zoneTables.map((table) => (
                <div key={table.id} className="flex items-center justify-between py-3">
                  <div className="flex items-center gap-4">
                    <div className="w-10 h-10 rounded-lg bg-primary/10 flex items-center justify-center">
                      <Users className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <p className="font-medium">{table.name}</p>
                      <p className="text-sm text-muted-foreground">
                        {table.capacity} seats
                      </p>
                    </div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => handleEdit(table)}
                    >
                      <Pencil className="h-4 w-4" />
                    </Button>
                    <Button
                      variant="ghost"
                      size="icon"
                      className="text-destructive hover:text-destructive"
                      onClick={() => {
                        if (confirm('Delete this table?')) {
                          deleteMutation.mutate(table.id);
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
      ))}
      
      {tables.length === 0 && (
        <Card>
          <CardContent className="py-12 text-center text-muted-foreground">
            No tables configured. Add your first table to get started.
          </CardContent>
        </Card>
      )}
      
      <Dialog open={showDialog} onOpenChange={setShowDialog}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>
              {editingTable ? 'Edit Table' : 'Add Table'}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-4 py-4">
            <div className="space-y-2">
              <Label htmlFor="name">Table Name</Label>
              <Input
                id="name"
                placeholder="e.g., Table 1"
                value={formData.name}
                onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="capacity">Capacity (seats)</Label>
              <Input
                id="capacity"
                type="number"
                min={1}
                max={20}
                value={formData.capacity}
                onChange={(e) => setFormData({ ...formData, capacity: parseInt(e.target.value) || 1 })}
              />
            </div>
            
            <div className="space-y-2">
              <Label htmlFor="zone">Zone (optional)</Label>
              <Input
                id="zone"
                placeholder="e.g., Patio, Main, Private"
                value={formData.zone}
                onChange={(e) => setFormData({ ...formData, zone: e.target.value })}
              />
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
              {editingTable ? 'Save Changes' : 'Add Table'}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}

