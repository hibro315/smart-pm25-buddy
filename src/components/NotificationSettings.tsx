import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Slider } from '@/components/ui/slider';
import { useNotificationSettings } from '@/hooks/useNotificationSettings';
import { Loader2, Bell, Moon, MapPin, Activity } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

export const NotificationSettings: React.FC = () => {
  const { settings, loading, saveSettings, isQuietHours } = useNotificationSettings();
  const [localSettings, setLocalSettings] = useState(settings);
  const [saving, setSaving] = useState(false);

  React.useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleSave = async () => {
    setSaving(true);
    await saveSettings(localSettings);
    setSaving(false);
  };

  if (loading) {
    return (
      <Card>
        <CardContent className="flex items-center justify-center py-12">
          <Loader2 className="h-8 w-8 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  const currentlyQuiet = isQuietHours();

  return (
    <div className="space-y-6">
      {/* AQI Threshold Settings */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Bell className="h-5 w-5 text-primary" />
            <CardTitle>AQI Alert Threshold</CardTitle>
          </div>
          <CardDescription>
            Receive notifications when AQI exceeds this level
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label>AQI Threshold: {localSettings.aqi_threshold}</Label>
              <Badge variant={localSettings.aqi_threshold > 150 ? 'destructive' : 'secondary'}>
                {localSettings.aqi_threshold <= 50 ? 'Good' : 
                 localSettings.aqi_threshold <= 100 ? 'Moderate' :
                 localSettings.aqi_threshold <= 150 ? 'Unhealthy for Sensitive' :
                 'Unhealthy'}
              </Badge>
            </div>
            <Slider
              value={[localSettings.aqi_threshold]}
              onValueChange={(value) => 
                setLocalSettings(prev => ({ ...prev, aqi_threshold: value[0] }))
              }
              min={50}
              max={200}
              step={10}
              className="w-full"
            />
            <div className="flex justify-between text-xs text-muted-foreground">
              <span>50 (Good)</span>
              <span>100 (Moderate)</span>
              <span>150 (Unhealthy)</span>
              <span>200 (Very Unhealthy)</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Quiet Hours */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Moon className="h-5 w-5 text-primary" />
            <CardTitle>Quiet Hours</CardTitle>
          </div>
          <CardDescription>
            Disable notifications during specified hours
            {currentlyQuiet && <Badge variant="secondary" className="ml-2">Currently Active</Badge>}
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <Label htmlFor="quiet-hours">Enable Quiet Hours</Label>
            <Switch
              id="quiet-hours"
              checked={localSettings.enable_quiet_hours}
              onCheckedChange={(checked) =>
                setLocalSettings(prev => ({ ...prev, enable_quiet_hours: checked }))
              }
            />
          </div>

          {localSettings.enable_quiet_hours && (
            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-2">
                <Label htmlFor="quiet-start">Start Time</Label>
                <Input
                  id="quiet-start"
                  type="time"
                  value={localSettings.quiet_hours_start}
                  onChange={(e) =>
                    setLocalSettings(prev => ({ 
                      ...prev, 
                      quiet_hours_start: e.target.value 
                    }))
                  }
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="quiet-end">End Time</Label>
                <Input
                  id="quiet-end"
                  type="time"
                  value={localSettings.quiet_hours_end}
                  onChange={(e) =>
                    setLocalSettings(prev => ({ 
                      ...prev, 
                      quiet_hours_end: e.target.value 
                    }))
                  }
                />
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Location Rules */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <CardTitle>Location-Based Rules</CardTitle>
          </div>
          <CardDescription>
            Set custom alert thresholds for specific locations
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-sm text-muted-foreground text-center py-4">
            {localSettings.location_rules.length === 0 ? (
              <p>No location rules configured yet</p>
            ) : (
              <div className="space-y-2">
                {localSettings.location_rules.map((rule) => (
                  <div key={rule.id} className="flex items-center justify-between p-2 border rounded">
                    <div>
                      <p className="font-medium">{rule.name}</p>
                      <p className="text-xs text-muted-foreground">
                        Alert when AQI &gt; {rule.customThreshold}
                      </p>
                    </div>
                    <Button 
                      variant="ghost" 
                      size="sm"
                      onClick={() => {
                        setLocalSettings(prev => ({
                          ...prev,
                          location_rules: prev.location_rules.filter(r => r.id !== rule.id)
                        }));
                      }}
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </div>
          <Button variant="outline" className="w-full" disabled>
            Add Location Rule (Coming Soon)
          </Button>
        </CardContent>
      </Card>

      {/* Symptom Alerts */}
      <Card>
        <CardHeader>
          <div className="flex items-center gap-2">
            <Activity className="h-5 w-5 text-primary" />
            <CardTitle>Symptom-Based Alerts</CardTitle>
          </div>
          <CardDescription>
            Get notified when your symptoms worsen
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="flex items-center justify-between">
            <Label htmlFor="symptom-alerts">Enable Symptom Alerts</Label>
            <Switch
              id="symptom-alerts"
              checked={localSettings.symptom_alerts_enabled}
              onCheckedChange={(checked) =>
                setLocalSettings(prev => ({ ...prev, symptom_alerts_enabled: checked }))
              }
            />
          </div>
        </CardContent>
      </Card>

      {/* Save Button */}
      <Button
        onClick={handleSave}
        disabled={saving}
        className="w-full"
        size="lg"
      >
        {saving ? (
          <>
            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
            Saving...
          </>
        ) : (
          'Save Notification Settings'
        )}
      </Button>
    </div>
  );
};
