export type Json =
  | string
  | number
  | boolean
  | null
  | { [key: string]: Json | undefined }
  | Json[];

export type UserRole = "owner" | "admin" | "member";
export type ConnectorStatus = "active" | "paused" | "error" | "disconnected";
export type SyncJobStatus =
  | "pending"
  | "running"
  | "completed"
  | "failed"
  | "cancelled";
export type SubscriptionStatus =
  | "trialing"
  | "active"
  | "past_due"
  | "canceled"
  | "incomplete"
  | "incomplete_expired"
  | "unpaid"
  | "paused";

export type AiMessageRole = "user" | "assistant";

export type Database = {
  public: {
    Tables: {
      users: {
        Relationships: [];
        Row: {
          id: string;
          email: string;
          full_name: string | null;
          avatar_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id: string;
          email: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          email?: string;
          full_name?: string | null;
          avatar_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      workspaces: {
        Relationships: [];
        Row: {
          id: string;
          name: string;
          slug: string;
          owner_id: string;
          logo_url: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          name: string;
          slug: string;
          owner_id: string;
          logo_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          name?: string;
          slug?: string;
          owner_id?: string;
          logo_url?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      workspace_members: {
        Relationships: [];
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          role: UserRole;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          role?: UserRole;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          user_id?: string;
          role?: UserRole;
          created_at?: string;
        };
      };
      connectors: {
        Relationships: [];
        Row: {
          id: string;
          workspace_id: string;
          name: string;
          provider: string;
          status: ConnectorStatus;
          config: Json;
          external_account_id: string | null;
          external_account_name: string | null;
          connected_by: string | null;
          last_synced_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          name: string;
          provider: string;
          status?: ConnectorStatus;
          config?: Json;
          external_account_id?: string | null;
          external_account_name?: string | null;
          connected_by?: string | null;
          last_synced_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          name?: string;
          provider?: string;
          status?: ConnectorStatus;
          config?: Json;
          external_account_id?: string | null;
          external_account_name?: string | null;
          connected_by?: string | null;
          last_synced_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      connector_credentials: {
        Relationships: [];
        Row: {
          connector_id: string;
          access_token_ciphertext: string;
          access_token_iv: string;
          access_token_tag: string;
          refresh_token_ciphertext: string | null;
          refresh_token_iv: string | null;
          refresh_token_tag: string | null;
          token_expires_at: string | null;
          key_version: number;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          connector_id: string;
          access_token_ciphertext: string;
          access_token_iv: string;
          access_token_tag: string;
          refresh_token_ciphertext?: string | null;
          refresh_token_iv?: string | null;
          refresh_token_tag?: string | null;
          token_expires_at?: string | null;
          key_version?: number;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          connector_id?: string;
          access_token_ciphertext?: string;
          access_token_iv?: string;
          access_token_tag?: string;
          refresh_token_ciphertext?: string | null;
          refresh_token_iv?: string | null;
          refresh_token_tag?: string | null;
          token_expires_at?: string | null;
          key_version?: number;
          created_at?: string;
          updated_at?: string;
        };
      };
      oauth_pending_sessions: {
        Relationships: [];
        Row: {
          id: string;
          user_id: string;
          workspace_id: string;
          provider: string;
          state: string;
          access_token: string;
          expires_at: string;
          created_at: string;
        };
        Insert: {
          id?: string;
          user_id: string;
          workspace_id: string;
          provider?: string;
          state: string;
          access_token: string;
          expires_at: string;
          created_at?: string;
        };
        Update: {
          id?: string;
          user_id?: string;
          workspace_id?: string;
          provider?: string;
          state?: string;
          access_token?: string;
          expires_at?: string;
          created_at?: string;
        };
      };
      workspace_sync_schedules: {
        Relationships: [];
        Row: {
          id: string;
          workspace_id: string;
          frequency: "hourly" | "daily" | "weekly";
          enabled: boolean;
          next_run_at: string | null;
          last_saved_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          frequency: "hourly" | "daily" | "weekly";
          enabled?: boolean;
          next_run_at?: string | null;
          last_saved_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          frequency?: "hourly" | "daily" | "weekly";
          enabled?: boolean;
          next_run_at?: string | null;
          last_saved_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      sync_jobs: {
        Relationships: [];
        Row: {
          id: string;
          connector_id: string;
          workspace_id: string;
          status: SyncJobStatus;
          started_at: string | null;
          completed_at: string | null;
          records_processed: number;
          error_message: string | null;
          metadata: Json;
          created_at: string;
        };
        Insert: {
          id?: string;
          connector_id: string;
          workspace_id: string;
          status?: SyncJobStatus;
          started_at?: string | null;
          completed_at?: string | null;
          records_processed?: number;
          error_message?: string | null;
          metadata?: Json;
          created_at?: string;
        };
        Update: {
          id?: string;
          connector_id?: string;
          workspace_id?: string;
          status?: SyncJobStatus;
          started_at?: string | null;
          completed_at?: string | null;
          records_processed?: number;
          error_message?: string | null;
          metadata?: Json;
          created_at?: string;
        };
      };
      subscriptions: {
        Relationships: [];
        Row: {
          id: string;
          workspace_id: string;
          stripe_customer_id: string | null;
          stripe_subscription_id: string | null;
          stripe_price_id: string | null;
          plan_id: string;
          status: SubscriptionStatus;
          current_period_start: string | null;
          current_period_end: string | null;
          cancel_at_period_end: boolean;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          stripe_price_id?: string | null;
          plan_id?: string;
          status?: SubscriptionStatus;
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          stripe_customer_id?: string | null;
          stripe_subscription_id?: string | null;
          stripe_price_id?: string | null;
          plan_id?: string;
          status?: SubscriptionStatus;
          current_period_start?: string | null;
          current_period_end?: string | null;
          cancel_at_period_end?: boolean;
          created_at?: string;
          updated_at?: string;
        };
      };
      ai_conversations: {
        Relationships: [];
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          title: string;
          title_generated: boolean;
          last_message_preview: string | null;
          archived_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          title?: string;
          title_generated?: boolean;
          last_message_preview?: string | null;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          user_id?: string;
          title?: string;
          title_generated?: boolean;
          last_message_preview?: string | null;
          archived_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      ai_messages: {
        Relationships: [];
        Row: {
          id: string;
          conversation_id: string;
          role: AiMessageRole;
          content: string;
          metadata: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          conversation_id: string;
          role: AiMessageRole;
          content: string;
          metadata?: Json | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          conversation_id?: string;
          role?: AiMessageRole;
          content?: string;
          metadata?: Json | null;
          created_at?: string;
        };
      };
    };
    Views: Record<string, never>;
    Functions: Record<string, never>;
    Enums: Record<string, never>;
    CompositeTypes: Record<string, never>;
  };
};

export type User = Database["public"]["Tables"]["users"]["Row"];
export type Workspace = Database["public"]["Tables"]["workspaces"]["Row"];
export type Connector = Database["public"]["Tables"]["connectors"]["Row"];
export type ConnectorCredential =
  Database["public"]["Tables"]["connector_credentials"]["Row"];
export type OAuthPendingSession =
  Database["public"]["Tables"]["oauth_pending_sessions"]["Row"];
export type WorkspaceSyncSchedule =
  Database["public"]["Tables"]["workspace_sync_schedules"]["Row"];
export type SyncJob = Database["public"]["Tables"]["sync_jobs"]["Row"];
export type Subscription =
  Database["public"]["Tables"]["subscriptions"]["Row"];
export type AiConversation =
  Database["public"]["Tables"]["ai_conversations"]["Row"];
export type AiMessage = Database["public"]["Tables"]["ai_messages"]["Row"];
