import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Checkbox } from '@/components/ui/checkbox';
import { Slider } from '@/components/ui/slider';
import { Textarea } from '@/components/ui/textarea';
import { useDailySymptoms, DailySymptom } from '@/hooks/useDailySymptoms';
import { Loader2, Heart, AlertCircle } from 'lucide-react';
import { Badge } from '@/components/ui/badge';

const symptoms = [
  { key: 'cough', label: 'Cough', icon: '🤧' },
  { key: 'sneeze', label: 'Sneeze', icon: '🤧' },
  { key: 'wheezing', label: 'Wheezing', icon: '😮‍💨' },
  { key: 'chest_tightness', label: 'Chest Tightness', icon: '💔' },
  { key: 'eye_irritation', label: 'Eye Irritation', icon: '👁️' },
  { key: 'fatigue', label: 'Fatigue', icon: '😴' },
  { key: 'shortness_of_breath', label: 'Shortness of Breath', icon: '🫁' },
];

export const SymptomQuickLog: React.FC = () => {
  const { todaySymptoms, loading, saveSymptoms, hasLoggedToday } = useDailySymptoms();
  const [formData, setFormData] = useState<DailySymptom>({
    cough: false,
    sneeze: false,
    wheezing: false,
    chest_tightness: false,
    eye_irritation: false,
    fatigue: false,
    shortness_of_breath: false,
    notes: '',
  });
  const [saving, setSaving] = useState(false);
  const [expanded, setExpanded] = useState(!hasLoggedToday);

  const handleSymptomToggle = (symptomKey: string, checked: boolean) => {
    setFormData(prev => ({ ...prev, [symptomKey]: checked }));
  };

  const handleSeverityChange = (symptomKey: string, value: number[]) => {
    setFormData(prev => ({ ...prev, [`${symptomKey}_severity`]: value[0] }));
  };

  const handleSubmit = async () => {
    setSaving(true);
    await saveSymptoms(formData);
    setSaving(false);
    setExpanded(false);
  };

  if (loading) {
    return (
      <Card className="w-full">
        <CardContent className="flex items-center justify-center py-8">
          <Loader2 className="h-6 w-6 animate-spin text-primary" />
        </CardContent>
      </Card>
    );
  }

  if (hasLoggedToday && !expanded) {
    return (
      <Card className="w-full">
        <CardHeader className="pb-3">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <Heart className="h-5 w-5 text-green-500" />
              <CardTitle className="text-base">Today's Symptoms Logged</CardTitle>
            </div>
            <Button variant="ghost" size="sm" onClick={() => setExpanded(true)}>
              Edit
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <Badge variant="secondary">
            {Object.keys(todaySymptoms || {}).filter(k => todaySymptoms?.[k as keyof DailySymptom] === true).length} symptoms reported
          </Badge>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="w-full">
      <CardHeader>
        <div className="flex items-center gap-2">
          <AlertCircle className="h-5 w-5 text-orange-500" />
          <CardTitle className="text-base">Quick Symptom Log</CardTitle>
        </div>
        <p className="text-sm text-muted-foreground">
          Log your respiratory symptoms for today
        </p>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 gap-3">
          {symptoms.map(symptom => {
            const isChecked = formData[symptom.key as keyof DailySymptom] as boolean;
            const severityKey = `${symptom.key}_severity` as keyof DailySymptom;
            const severityValue = (formData[severityKey] as number) || 5;

            return (
              <div key={symptom.key} className="space-y-2">
                <div className="flex items-center gap-3">
                  <Checkbox
                    id={symptom.key}
                    checked={isChecked}
                    onCheckedChange={(checked) => 
                      handleSymptomToggle(symptom.key, checked as boolean)
                    }
                  />
                  <label
                    htmlFor={symptom.key}
                    className="text-sm font-medium flex items-center gap-2 cursor-pointer"
                  >
                    <span>{symptom.icon}</span>
                    {symptom.label}
                  </label>
                </div>
                {isChecked && (
                  <div className="ml-8 space-y-1">
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>Severity</span>
                      <span>{severityValue}/10</span>
                    </div>
                    <Slider
                      value={[severityValue]}
                      onValueChange={(value) => handleSeverityChange(symptom.key, value)}
                      min={0}
                      max={10}
                      step={1}
                      className="w-full"
                    />
                  </div>
                )}
              </div>
            );
          })}
        </div>

        <div className="space-y-2">
          <label className="text-sm font-medium">Additional Notes (Optional)</label>
          <Textarea
            placeholder="Any other symptoms or observations..."
            value={formData.notes || ''}
            onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
            rows={2}
          />
        </div>

        <div className="flex gap-2">
          <Button
            onClick={handleSubmit}
            disabled={saving}
            className="flex-1"
          >
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                Saving...
              </>
            ) : (
              'Save Symptoms'
            )}
          </Button>
          {hasLoggedToday && (
            <Button
              variant="outline"
              onClick={() => setExpanded(false)}
            >
              Cancel
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
};
