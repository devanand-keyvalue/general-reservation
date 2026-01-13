import { useState } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { TablesManager } from './settings/TablesManager';
import { ServicesManager } from './settings/ServicesManager';
import { StaffManager } from './settings/StaffManager';
import { StaffScheduleManager } from './settings/StaffScheduleManager';
import { BusinessSettings } from './settings/BusinessSettings';
import { Table2, Sparkles, Users, Calendar, Settings } from 'lucide-react';

interface SettingsPanelProps {
  businessId: string;
  businessType: 'restaurant' | 'spa';
  onClose: () => void;
}

export function SettingsPanel({ businessId, businessType, onClose }: SettingsPanelProps) {
  const [activeTab, setActiveTab] = useState(businessType === 'restaurant' ? 'tables' : 'services');
  
  return (
    <div className="fixed inset-0 bg-background z-50 overflow-auto">
      <div className="container mx-auto px-4 py-6 max-w-4xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="font-display text-2xl font-semibold">Settings</h2>
          <button
            onClick={onClose}
            className="px-4 py-2 text-sm font-medium rounded-lg hover:bg-muted transition-colors"
          >
            ← Back to Dashboard
          </button>
        </div>
        
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="mb-6">
            {businessType === 'restaurant' ? (
              <TabsTrigger value="tables" className="flex items-center gap-2">
                <Table2 className="h-4 w-4" />
                Tables
              </TabsTrigger>
            ) : (
              <>
                <TabsTrigger value="services" className="flex items-center gap-2">
                  <Sparkles className="h-4 w-4" />
                  Services
                </TabsTrigger>
                <TabsTrigger value="staff" className="flex items-center gap-2">
                  <Users className="h-4 w-4" />
                  Staff
                </TabsTrigger>
                <TabsTrigger value="schedules" className="flex items-center gap-2">
                  <Calendar className="h-4 w-4" />
                  Schedules
                </TabsTrigger>
              </>
            )}
            <TabsTrigger value="business" className="flex items-center gap-2">
              <Settings className="h-4 w-4" />
              Business
            </TabsTrigger>
          </TabsList>
          
          {businessType === 'restaurant' ? (
            <TabsContent value="tables">
              <TablesManager businessId={businessId} />
            </TabsContent>
          ) : (
            <>
              <TabsContent value="services">
                <ServicesManager businessId={businessId} />
              </TabsContent>
              <TabsContent value="staff">
                <StaffManager businessId={businessId} />
              </TabsContent>
              <TabsContent value="schedules">
                <StaffScheduleManager businessId={businessId} />
              </TabsContent>
            </>
          )}
          
          <TabsContent value="business">
            <BusinessSettings businessId={businessId} businessType={businessType} />
          </TabsContent>
        </Tabs>
      </div>
    </div>
  );
}

