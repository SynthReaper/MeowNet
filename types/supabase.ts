// types/supabase.ts — Supabase database types
// Run `npx supabase gen types typescript --project-id YOUR_ID > types/supabase.ts` to regenerate

export type Json = string | number | boolean | null | { [key: string]: Json | undefined } | Json[];

export interface Database {
  public: {
    Tables: {
      profiles: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          empire_points: number;
          weekly_points: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          display_name?: string | null;
          avatar_url?: string | null;
          empire_points?: number;
          weekly_points?: number;
        };
        Update: {
          display_name?: string | null;
          avatar_url?: string | null;
          empire_points?: number;
          weekly_points?: number;
        };
      };
      cats: {
        Row: {
          id: string;
          owner_id: string;
          name: string | null;
          photo_url: string;
          status: 'stray' | 'tnr_needed' | 'adoptable' | 'adopted' | 'fostered';
          location: string; // PostGIS geometry serialized
          location_privacy: 'exact' | 'area';
          breed_estimate: string | null;
          breed_confidence: number | null;
          bcs_estimate: number | null;
          health_flags: string[];
          health_notes: string | null;
          age_estimate: 'kitten' | 'juvenile' | 'adult' | 'senior' | null;
          color: string | null;
          sterilized: boolean;
          vaccinated: boolean;
          microchipped: boolean;
          contact_info: string | null;
          shelter_url: string | null;
          consent_recorded: boolean;
          created_at: string;
          updated_at: string;
          // Computed from PostGIS — returned as lat/lng by queries
          lat?: number;
          lng?: number;
        };
        Insert: {
          owner_id: string;
          photo_url: string;
          status: 'stray' | 'tnr_needed' | 'adoptable' | 'adopted' | 'fostered';
          lat: number;
          lng: number;
          location_privacy?: 'exact' | 'area';
          name?: string | null;
          breed_estimate?: string | null;
          breed_confidence?: number | null;
          bcs_estimate?: number | null;
          health_flags?: string[];
          health_notes?: string | null;
          age_estimate?: 'kitten' | 'juvenile' | 'adult' | 'senior' | null;
          color?: string | null;
          sterilized?: boolean;
          vaccinated?: boolean;
          microchipped?: boolean;
          contact_info?: string | null;
          shelter_url?: string | null;
          consent_recorded?: boolean;
        };
        Update: Partial<Database['public']['Tables']['cats']['Insert']>;
      };
      tnr_events: {
        Row: {
          id: string;
          organizer_id: string;
          title: string;
          description: string | null;
          lat: number;
          lng: number;
          event_time: string;
          capacity: number;
          status: 'open' | 'completed' | 'cancelled';
          cats_tnrd_count: number;
          created_at: string;
          updated_at: string;
          signup_count?: number;
        };
        Insert: {
          organizer_id: string;
          title: string;
          description?: string | null;
          lat: number;
          lng: number;
          event_time: string;
          capacity: number;
        };
        Update: Partial<Database['public']['Tables']['tnr_events']['Insert']> & {
          status?: 'open' | 'completed' | 'cancelled';
          cats_tnrd_count?: number;
        };
      };
      event_signups: {
        Row: {
          id: string;
          event_id: string;
          user_id: string;
          signed_up_at: string;
          attended: boolean;
        };
        Insert: { event_id: string; user_id: string };
        Update: { attended?: boolean };
      };
      point_log: {
        Row: {
          id: string;
          user_id: string;
          activity: string;
          points: number;
          related_id: string | null;
          action_key: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: never; // service_role only
        Update: never; // immutable ledger
      };
      badges: {
        Row: { id: string; name: string; description: string; icon: string; rarity: 'common' | 'rare' | 'legendary' };
        Insert: never;
        Update: never;
      };
      user_badges: {
        Row: { user_id: string; badge_id: string; earned_at: string };
        Insert: never;
        Update: never;
      };
    };
    Views: {
      leaderboard_weekly: {
        Row: {
          id: string;
          display_name: string | null;
          avatar_url: string | null;
          weekly_points: number;
          actions_taken: number;
          badge_ids: string[] | null;
        };
      };
      impact_summary: {
        Row: {
          total_cats: number;
          tnr_count: number;
          adopted_count: number;
          active_volunteers: number;
          total_events: number;
        };
      };
    };
    Functions: {
      award_points: {
        Args: { p_user_id: string; p_activity: string; p_points: number; p_related_id?: string; p_action_key?: string };
        Returns: void;
      };
      can_manage_event: {
        Args: { p_event_id: string; p_user_id: string };
        Returns: boolean;
      };
      delete_user_account: {
        Args: { p_user_id: string };
        Returns: void;
      };
    };
  };
}
