// src/types/supabase.ts
export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      teachers: {
        Row: {
          id: string;
          first_name: string;
          last_name: string;
          email: string | null;
          subjects: string[];
          max_hours_per_week: number;
          preferences: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          first_name: string;
          last_name: string;
          email?: string | null;
          subjects?: string[];
          max_hours_per_week?: number;
          preferences?: Json | null;
        };
        Update: {
          id?: string;
          first_name?: string;
          last_name?: string;
          email?: string | null;
          subjects?: string[];
          max_hours_per_week?: number;
          preferences?: Json | null;
        };
      };
      school_classes: {
        Row: {
          id: string;
          name: string;
          level?: number;
          student_count?: number;
          special_needs?: boolean;
          created_at: string;
        };
      };
      subjects: {
        Row: {
          id: string;
          name: string;
          abbreviation?: string;
          category?: string;
          requires_double_lesson?: boolean;
          created_at: string;
        };
      };
      rooms: {
        Row: {
          id: string;
          name: string;
          type?: string;
          capacity?: number;
          created_at: string;
        };
      };
      lesson_requirements: {
        Row: {
          id: string;
          class_id: string;
          subject_id: string;
          hours_per_week: number;
        };
      };
      timetable_entries: {
        Row: {
          id: string;
          teacher_id?: string;
          class_id?: string;
          subject_id?: string;
          room_id?: string;
          day_of_week: number;
          period: number;
          created_at: string;
        };
      };
    };
  };
}
