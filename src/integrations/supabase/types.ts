export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[]

export type Database = {
  // Allows to automatically instantiate createClient with right options
  // instead of createClient<Database, { PostgrestVersion: 'XX' }>(URL, KEY)
  __InternalSupabase: {
    PostgrestVersion: "13.0.5"
  }
  public: {
    Tables: {
      daily_symptoms: {
        Row: {
          chest_tightness: boolean | null
          chest_tightness_severity: number | null
          cough: boolean | null
          cough_severity: number | null
          created_at: string | null
          eye_irritation: boolean | null
          eye_irritation_severity: number | null
          fatigue: boolean | null
          fatigue_severity: number | null
          id: string
          log_date: string | null
          notes: string | null
          shortness_of_breath: boolean | null
          shortness_of_breath_severity: number | null
          sneeze: boolean | null
          sneeze_severity: number | null
          symptom_score: number | null
          user_id: string
          wheezing: boolean | null
          wheezing_severity: number | null
        }
        Insert: {
          chest_tightness?: boolean | null
          chest_tightness_severity?: number | null
          cough?: boolean | null
          cough_severity?: number | null
          created_at?: string | null
          eye_irritation?: boolean | null
          eye_irritation_severity?: number | null
          fatigue?: boolean | null
          fatigue_severity?: number | null
          id?: string
          log_date?: string | null
          notes?: string | null
          shortness_of_breath?: boolean | null
          shortness_of_breath_severity?: number | null
          sneeze?: boolean | null
          sneeze_severity?: number | null
          symptom_score?: number | null
          user_id: string
          wheezing?: boolean | null
          wheezing_severity?: number | null
        }
        Update: {
          chest_tightness?: boolean | null
          chest_tightness_severity?: number | null
          cough?: boolean | null
          cough_severity?: number | null
          created_at?: string | null
          eye_irritation?: boolean | null
          eye_irritation_severity?: number | null
          fatigue?: boolean | null
          fatigue_severity?: number | null
          id?: string
          log_date?: string | null
          notes?: string | null
          shortness_of_breath?: boolean | null
          shortness_of_breath_severity?: number | null
          sneeze?: boolean | null
          sneeze_severity?: number | null
          symptom_score?: number | null
          user_id?: string
          wheezing?: boolean | null
          wheezing_severity?: number | null
        }
        Relationships: []
      }
      health_logs: {
        Row: {
          age: number
          aqi: number
          co: number | null
          created_at: string
          gender: string | null
          has_symptoms: boolean | null
          id: string
          location: string | null
          log_date: string
          no2: number | null
          o3: number | null
          outdoor_time: number
          phri: number
          pm10: number | null
          pm25: number
          so2: number | null
          symptoms: string[] | null
          user_id: string
          wearing_mask: boolean | null
        }
        Insert: {
          age: number
          aqi: number
          co?: number | null
          created_at?: string
          gender?: string | null
          has_symptoms?: boolean | null
          id?: string
          location?: string | null
          log_date?: string
          no2?: number | null
          o3?: number | null
          outdoor_time: number
          phri: number
          pm10?: number | null
          pm25: number
          so2?: number | null
          symptoms?: string[] | null
          user_id: string
          wearing_mask?: boolean | null
        }
        Update: {
          age?: number
          aqi?: number
          co?: number | null
          created_at?: string
          gender?: string | null
          has_symptoms?: boolean | null
          id?: string
          location?: string | null
          log_date?: string
          no2?: number | null
          o3?: number | null
          outdoor_time?: number
          phri?: number
          pm10?: number | null
          pm25?: number
          so2?: number | null
          symptoms?: string[] | null
          user_id?: string
          wearing_mask?: boolean | null
        }
        Relationships: []
      }
      notification_settings: {
        Row: {
          aqi_threshold: number | null
          created_at: string | null
          enable_quiet_hours: boolean | null
          id: string
          location_rules: Json | null
          quiet_hours_end: string | null
          quiet_hours_start: string | null
          symptom_alerts_enabled: boolean | null
          updated_at: string | null
          user_id: string
        }
        Insert: {
          aqi_threshold?: number | null
          created_at?: string | null
          enable_quiet_hours?: boolean | null
          id?: string
          location_rules?: Json | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          symptom_alerts_enabled?: boolean | null
          updated_at?: string | null
          user_id: string
        }
        Update: {
          aqi_threshold?: number | null
          created_at?: string | null
          enable_quiet_hours?: boolean | null
          id?: string
          location_rules?: Json | null
          quiet_hours_end?: string | null
          quiet_hours_start?: string | null
          symptom_alerts_enabled?: boolean | null
          updated_at?: string | null
          user_id?: string
        }
        Relationships: []
      }
      performance_metrics: {
        Row: {
          created_at: string
          error_message: string | null
          id: string
          latency_ms: number | null
          metadata: Json | null
          metric_type: string
          operation: string
          success: boolean
          user_id: string
        }
        Insert: {
          created_at?: string
          error_message?: string | null
          id?: string
          latency_ms?: number | null
          metadata?: Json | null
          metric_type: string
          operation: string
          success?: boolean
          user_id: string
        }
        Update: {
          created_at?: string
          error_message?: string | null
          id?: string
          latency_ms?: number | null
          metadata?: Json | null
          metric_type?: string
          operation?: string
          success?: boolean
          user_id?: string
        }
        Relationships: []
      }
      push_subscriptions: {
        Row: {
          created_at: string
          enabled: boolean
          id: string
          last_check: string | null
          last_location: Json | null
          last_pm25: number | null
          notification_settings: Json | null
          subscription: Json
          updated_at: string
          user_id: string
        }
        Insert: {
          created_at?: string
          enabled?: boolean
          id?: string
          last_check?: string | null
          last_location?: Json | null
          last_pm25?: number | null
          notification_settings?: Json | null
          subscription: Json
          updated_at?: string
          user_id: string
        }
        Update: {
          created_at?: string
          enabled?: boolean
          id?: string
          last_check?: string | null
          last_location?: Json | null
          last_pm25?: number | null
          notification_settings?: Json | null
          subscription?: Json
          updated_at?: string
          user_id?: string
        }
        Relationships: []
      }
      vital_signs: {
        Row: {
          anomalies: string[] | null
          bp_diastolic: number
          bp_systolic: number
          created_at: string
          heart_rate: number
          id: string
          log_date: string
          mean_arterial_pressure: number | null
          pulse_pressure: number | null
          respiration_rate: number
          risk_level: string | null
          risk_score: number | null
          shock_index: number | null
          spo2: number
          temperature: number
          trends: Json | null
          user_id: string
        }
        Insert: {
          anomalies?: string[] | null
          bp_diastolic: number
          bp_systolic: number
          created_at?: string
          heart_rate: number
          id?: string
          log_date?: string
          mean_arterial_pressure?: number | null
          pulse_pressure?: number | null
          respiration_rate: number
          risk_level?: string | null
          risk_score?: number | null
          shock_index?: number | null
          spo2: number
          temperature: number
          trends?: Json | null
          user_id: string
        }
        Update: {
          anomalies?: string[] | null
          bp_diastolic?: number
          bp_systolic?: number
          created_at?: string
          heart_rate?: number
          id?: string
          log_date?: string
          mean_arterial_pressure?: number | null
          pulse_pressure?: number | null
          respiration_rate?: number
          risk_level?: string | null
          risk_score?: number | null
          shock_index?: number | null
          spo2?: number
          temperature?: number
          trends?: Json | null
          user_id?: string
        }
        Relationships: []
      }
    }
    Views: {
      performance_summary: {
        Row: {
          avg_latency_ms: number | null
          failed_calls: number | null
          first_recorded: string | null
          last_recorded: string | null
          max_latency_ms: number | null
          median_latency_ms: number | null
          metric_type: string | null
          operation: string | null
          p95_latency_ms: number | null
          success_rate: number | null
          successful_calls: number | null
          total_calls: number | null
          user_id: string | null
        }
        Relationships: []
      }
    }
    Functions: {
      [_ in never]: never
    }
    Enums: {
      [_ in never]: never
    }
    CompositeTypes: {
      [_ in never]: never
    }
  }
}

type DatabaseWithoutInternals = Omit<Database, "__InternalSupabase">

type DefaultSchema = DatabaseWithoutInternals[Extract<keyof Database, "public">]

export type Tables<
  DefaultSchemaTableNameOrOptions extends
    | keyof (DefaultSchema["Tables"] & DefaultSchema["Views"])
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
        DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? (DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"] &
      DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Views"])[TableName] extends {
      Row: infer R
    }
    ? R
    : never
  : DefaultSchemaTableNameOrOptions extends keyof (DefaultSchema["Tables"] &
        DefaultSchema["Views"])
    ? (DefaultSchema["Tables"] &
        DefaultSchema["Views"])[DefaultSchemaTableNameOrOptions] extends {
        Row: infer R
      }
      ? R
      : never
    : never

export type TablesInsert<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Insert: infer I
    }
    ? I
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Insert: infer I
      }
      ? I
      : never
    : never

export type TablesUpdate<
  DefaultSchemaTableNameOrOptions extends
    | keyof DefaultSchema["Tables"]
    | { schema: keyof DatabaseWithoutInternals },
  TableName extends DefaultSchemaTableNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"]
    : never = never,
> = DefaultSchemaTableNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaTableNameOrOptions["schema"]]["Tables"][TableName] extends {
      Update: infer U
    }
    ? U
    : never
  : DefaultSchemaTableNameOrOptions extends keyof DefaultSchema["Tables"]
    ? DefaultSchema["Tables"][DefaultSchemaTableNameOrOptions] extends {
        Update: infer U
      }
      ? U
      : never
    : never

export type Enums<
  DefaultSchemaEnumNameOrOptions extends
    | keyof DefaultSchema["Enums"]
    | { schema: keyof DatabaseWithoutInternals },
  EnumName extends DefaultSchemaEnumNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"]
    : never = never,
> = DefaultSchemaEnumNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[DefaultSchemaEnumNameOrOptions["schema"]]["Enums"][EnumName]
  : DefaultSchemaEnumNameOrOptions extends keyof DefaultSchema["Enums"]
    ? DefaultSchema["Enums"][DefaultSchemaEnumNameOrOptions]
    : never

export type CompositeTypes<
  PublicCompositeTypeNameOrOptions extends
    | keyof DefaultSchema["CompositeTypes"]
    | { schema: keyof DatabaseWithoutInternals },
  CompositeTypeName extends PublicCompositeTypeNameOrOptions extends {
    schema: keyof DatabaseWithoutInternals
  }
    ? keyof DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"]
    : never = never,
> = PublicCompositeTypeNameOrOptions extends {
  schema: keyof DatabaseWithoutInternals
}
  ? DatabaseWithoutInternals[PublicCompositeTypeNameOrOptions["schema"]]["CompositeTypes"][CompositeTypeName]
  : PublicCompositeTypeNameOrOptions extends keyof DefaultSchema["CompositeTypes"]
    ? DefaultSchema["CompositeTypes"][PublicCompositeTypeNameOrOptions]
    : never

export const Constants = {
  public: {
    Enums: {},
  },
} as const
