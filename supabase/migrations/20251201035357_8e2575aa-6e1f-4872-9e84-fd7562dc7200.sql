-- Create geofence_zones table for location-based notifications
CREATE TABLE public.geofence_zones (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL,
  name TEXT NOT NULL,
  latitude NUMERIC NOT NULL,
  longitude NUMERIC NOT NULL,
  radius INTEGER NOT NULL DEFAULT 100,
  notify_on_enter BOOLEAN NOT NULL DEFAULT true,
  notify_on_exit BOOLEAN NOT NULL DEFAULT true,
  is_active BOOLEAN NOT NULL DEFAULT true,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS
ALTER TABLE public.geofence_zones ENABLE ROW LEVEL SECURITY;

-- Create policies
CREATE POLICY "Users can view their own zones"
ON public.geofence_zones
FOR SELECT
USING (auth.uid() = user_id);

CREATE POLICY "Users can create their own zones"
ON public.geofence_zones
FOR INSERT
WITH CHECK (auth.uid() = user_id);

CREATE POLICY "Users can update their own zones"
ON public.geofence_zones
FOR UPDATE
USING (auth.uid() = user_id);

CREATE POLICY "Users can delete their own zones"
ON public.geofence_zones
FOR DELETE
USING (auth.uid() = user_id);

-- Create trigger for updated_at
CREATE TRIGGER update_geofence_zones_updated_at
BEFORE UPDATE ON public.geofence_zones
FOR EACH ROW
EXECUTE FUNCTION public.update_updated_at_column();