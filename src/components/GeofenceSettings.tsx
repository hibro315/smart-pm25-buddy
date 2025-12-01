import { useState } from 'react';
import { useGeofencing, GeofenceZone } from '@/hooks/useGeofencing';
import { Card } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Switch } from '@/components/ui/switch';
import { Trash2, Plus, MapPin, Edit2, Check, X } from 'lucide-react';
import { toast } from 'sonner';

export const GeofenceSettings = () => {
  const { zones, loading, addZone, updateZone, deleteZone } = useGeofencing();
  const [isAdding, setIsAdding] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [formData, setFormData] = useState({
    name: '',
    latitude: '',
    longitude: '',
    radius: '100',
    notify_on_enter: true,
    notify_on_exit: true,
    is_active: true,
  });

  const handleGetCurrentLocation = () => {
    if ('geolocation' in navigator) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          setFormData((prev) => ({
            ...prev,
            latitude: position.coords.latitude.toFixed(6),
            longitude: position.coords.longitude.toFixed(6),
          }));
          toast.success('ได้รับตำแหน่งปัจจุบัน');
        },
        (error) => {
          console.error('Error getting location:', error);
          toast.error('ไม่สามารถรับตำแหน่งปัจจุบันได้');
        }
      );
    } else {
      toast.error('เบราว์เซอร์ไม่รองรับ geolocation');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.name || !formData.latitude || !formData.longitude) {
      toast.error('กรุณากรอกข้อมูลให้ครบถ้วน');
      return;
    }

    try {
      const zoneData = {
        name: formData.name,
        latitude: parseFloat(formData.latitude),
        longitude: parseFloat(formData.longitude),
        radius: parseInt(formData.radius) || 100,
        notify_on_enter: formData.notify_on_enter,
        notify_on_exit: formData.notify_on_exit,
        is_active: formData.is_active,
      };

      if (editingId) {
        await updateZone(editingId, zoneData);
        setEditingId(null);
      } else {
        await addZone(zoneData);
      }

      setFormData({
        name: '',
        latitude: '',
        longitude: '',
        radius: '100',
        notify_on_enter: true,
        notify_on_exit: true,
        is_active: true,
      });
      setIsAdding(false);
    } catch (error) {
      console.error('Error saving zone:', error);
    }
  };

  const handleEdit = (zone: GeofenceZone) => {
    setEditingId(zone.id);
    setFormData({
      name: zone.name,
      latitude: zone.latitude.toString(),
      longitude: zone.longitude.toString(),
      radius: zone.radius.toString(),
      notify_on_enter: zone.notify_on_enter,
      notify_on_exit: zone.notify_on_exit,
      is_active: zone.is_active,
    });
    setIsAdding(true);
  };

  const handleCancel = () => {
    setIsAdding(false);
    setEditingId(null);
    setFormData({
      name: '',
      latitude: '',
      longitude: '',
      radius: '100',
      notify_on_enter: true,
      notify_on_exit: true,
      is_active: true,
    });
  };

  const handleToggleActive = async (zone: GeofenceZone) => {
    try {
      await updateZone(zone.id, { is_active: !zone.is_active });
    } catch (error) {
      console.error('Error toggling zone:', error);
    }
  };

  if (loading) {
    return (
      <Card className="p-6">
        <div className="flex items-center justify-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      </Card>
    );
  }

  return (
    <div className="space-y-4">
      <Card className="p-6">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <MapPin className="h-5 w-5 text-primary" />
            <h3 className="text-lg font-semibold">จัดการพื้นที่ Geofence</h3>
          </div>
          {!isAdding && (
            <Button onClick={() => setIsAdding(true)} size="sm">
              <Plus className="h-4 w-4 mr-2" />
              เพิ่มพื้นที่
            </Button>
          )}
        </div>

        {isAdding && (
          <form onSubmit={handleSubmit} className="space-y-4 mb-6 p-4 border rounded-lg bg-muted/50">
            <div className="grid gap-4 md:grid-cols-2">
              <div className="space-y-2">
                <Label htmlFor="name">ชื่อพื้นที่ *</Label>
                <Input
                  id="name"
                  placeholder="เช่น บ้าน, ที่ทำงาน, โรงเรียน"
                  value={formData.name}
                  onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="radius">รัศมี (เมตร) *</Label>
                <Input
                  id="radius"
                  type="number"
                  placeholder="100"
                  value={formData.radius}
                  onChange={(e) => setFormData({ ...formData, radius: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="latitude">ละติจูด *</Label>
                <Input
                  id="latitude"
                  type="number"
                  step="any"
                  placeholder="13.7563"
                  value={formData.latitude}
                  onChange={(e) => setFormData({ ...formData, latitude: e.target.value })}
                  required
                />
              </div>

              <div className="space-y-2">
                <Label htmlFor="longitude">ลองจิจูด *</Label>
                <Input
                  id="longitude"
                  type="number"
                  step="any"
                  placeholder="100.5018"
                  value={formData.longitude}
                  onChange={(e) => setFormData({ ...formData, longitude: e.target.value })}
                  required
                />
              </div>
            </div>

            <Button
              type="button"
              variant="outline"
              onClick={handleGetCurrentLocation}
              className="w-full"
            >
              <MapPin className="h-4 w-4 mr-2" />
              ใช้ตำแหน่งปัจจุบัน
            </Button>

            <div className="space-y-3">
              <div className="flex items-center justify-between">
                <Label htmlFor="notify-enter">แจ้งเตือนเมื่อเข้าพื้นที่</Label>
                <Switch
                  id="notify-enter"
                  checked={formData.notify_on_enter}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, notify_on_enter: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="notify-exit">แจ้งเตือนเมื่อออกจากพื้นที่</Label>
                <Switch
                  id="notify-exit"
                  checked={formData.notify_on_exit}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, notify_on_exit: checked })
                  }
                />
              </div>

              <div className="flex items-center justify-between">
                <Label htmlFor="is-active">เปิดใช้งาน</Label>
                <Switch
                  id="is-active"
                  checked={formData.is_active}
                  onCheckedChange={(checked) =>
                    setFormData({ ...formData, is_active: checked })
                  }
                />
              </div>
            </div>

            <div className="flex gap-2">
              <Button type="submit" className="flex-1">
                <Check className="h-4 w-4 mr-2" />
                {editingId ? 'อัปเดต' : 'เพิ่ม'}
              </Button>
              <Button type="button" variant="outline" onClick={handleCancel}>
                <X className="h-4 w-4 mr-2" />
                ยกเลิก
              </Button>
            </div>
          </form>
        )}

        <div className="space-y-3">
          {zones.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              <MapPin className="h-12 w-12 mx-auto mb-2 opacity-50" />
              <p>ยังไม่มีพื้นที่ Geofence</p>
              <p className="text-sm">เพิ่มพื้นที่เพื่อรับการแจ้งเตือนตามตำแหน่ง</p>
            </div>
          ) : (
            zones.map((zone) => (
              <div
                key={zone.id}
                className="p-4 border rounded-lg hover:bg-muted/50 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h4 className="font-medium">{zone.name}</h4>
                      {!zone.is_active && (
                        <span className="text-xs px-2 py-0.5 bg-muted rounded-full">
                          ปิดใช้งาน
                        </span>
                      )}
                    </div>
                    <div className="text-sm text-muted-foreground space-y-1">
                      <p>📍 {zone.latitude.toFixed(6)}, {zone.longitude.toFixed(6)}</p>
                      <p>⭕ รัศมี: {zone.radius} เมตร</p>
                      <div className="flex gap-3 mt-2">
                        {zone.notify_on_enter && (
                          <span className="text-xs px-2 py-1 bg-green-500/10 text-green-600 rounded">
                            แจ้งเมื่อเข้า
                          </span>
                        )}
                        {zone.notify_on_exit && (
                          <span className="text-xs px-2 py-1 bg-blue-500/10 text-blue-600 rounded">
                            แจ้งเมื่อออก
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                  <div className="flex gap-2">
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleToggleActive(zone)}
                    >
                      <Switch checked={zone.is_active} />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handleEdit(zone)}
                    >
                      <Edit2 className="h-4 w-4" />
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => deleteZone(zone.id)}
                    >
                      <Trash2 className="h-4 w-4 text-destructive" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
      </Card>

      <Card className="p-4 bg-blue-500/10 border-blue-500/20">
        <div className="text-sm space-y-2">
          <p className="font-medium text-blue-600">💡 คำแนะนำ</p>
          <ul className="text-blue-600/80 space-y-1 list-disc list-inside">
            <li>ตั้งรัศมีพื้นที่ตามความเหมาะสม (แนะนำ 100-500 เมตร)</li>
            <li>ใช้ตำแหน่งปัจจุบันเพื่อกำหนดพื้นที่อย่างแม่นยำ</li>
            <li>เปิดการแจ้งเตือนเมื่อเข้า/ออกตามความต้องการ</li>
            <li>แอปจะตรวจสอบตำแหน่งเมื่อทำงานในพื้นหลัง</li>
          </ul>
        </div>
      </Card>
    </div>
  );
};
