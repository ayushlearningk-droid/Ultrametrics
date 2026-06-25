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
          pinned_at: string | null;
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
          pinned_at?: string | null;
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
          pinned_at?: string | null;
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
      action_queue: {
        Relationships: [];
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          title: string;
          source: string | null;
          type: string | null;
          rationale: string | null;
          expected_impact: string | null;
          priority: "High" | "Medium" | "Low" | null;
          status: "pending" | "approved" | "dismissed";
          // Sprint 13A: structured executable target (nullable, not yet populated).
          provider: string | null;
          entity_level: "account" | "campaign" | "ad" | null;
          entity_id: string | null;
          action_type:
            | "PAUSE_CAMPAIGN"
            | "RESUME_CAMPAIGN"
            | "ADJUST_BUDGET"
            | null;
          params_json: Json | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          title: string;
          source?: string | null;
          type?: string | null;
          rationale?: string | null;
          expected_impact?: string | null;
          priority?: "High" | "Medium" | "Low" | null;
          status?: "pending" | "approved" | "dismissed";
          // Sprint 13A: structured executable target (nullable, not yet populated).
          provider?: string | null;
          entity_level?: "account" | "campaign" | "ad" | null;
          entity_id?: string | null;
          action_type?:
            | "PAUSE_CAMPAIGN"
            | "RESUME_CAMPAIGN"
            | "ADJUST_BUDGET"
            | null;
          params_json?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          user_id?: string;
          title?: string;
          source?: string | null;
          type?: string | null;
          rationale?: string | null;
          expected_impact?: string | null;
          priority?: "High" | "Medium" | "Low" | null;
          status?: "pending" | "approved" | "dismissed";
          // Sprint 13A: structured executable target (nullable, not yet populated).
          provider?: string | null;
          entity_level?: "account" | "campaign" | "ad" | null;
          entity_id?: string | null;
          action_type?:
            | "PAUSE_CAMPAIGN"
            | "RESUME_CAMPAIGN"
            | "ADJUST_BUDGET"
            | null;
          params_json?: Json | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      action_executions: {
        Relationships: [];
        Row: {
          id: string;
          action_id: string;
          workspace_id: string;
          user_id: string;
          actor_type: "user" | "system" | "ai";
          provider: string | null;
          attempt_no: number;
          idempotency_key: string | null;
          state:
            | "not_requested"
            | "queued"
            | "validating"
            | "running"
            | "succeeded"
            | "failed"
            | "cancelled"
            | "rollback_requested"
            | "rolling_back"
            | "rolled_back"
            | "rollback_failed";
          dry_run: boolean;
          request_payload: Json | null;
          prior_state: Json | null;
          result: Json | null;
          provider_request_id: string | null;
          error_code: string | null;
          error_message: string | null;
          error_class:
            | "transient"
            | "rate_limited"
            | "auth"
            | "validation"
            | "permanent"
            | null;
          duration_ms: number | null;
          original_execution_id: string | null;
          rollback_execution_id: string | null;
          rollback_reason: string | null;
          rolled_back_at: string | null;
          retryable: boolean;
          next_retry_at: string | null;
          started_at: string | null;
          completed_at: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          action_id: string;
          workspace_id: string;
          user_id: string;
          actor_type?: "user" | "system" | "ai";
          provider?: string | null;
          attempt_no?: number;
          idempotency_key?: string | null;
          state?:
            | "not_requested"
            | "queued"
            | "validating"
            | "running"
            | "succeeded"
            | "failed"
            | "cancelled"
            | "rollback_requested"
            | "rolling_back"
            | "rolled_back"
            | "rollback_failed";
          dry_run?: boolean;
          request_payload?: Json | null;
          prior_state?: Json | null;
          result?: Json | null;
          provider_request_id?: string | null;
          error_code?: string | null;
          error_message?: string | null;
          error_class?:
            | "transient"
            | "rate_limited"
            | "auth"
            | "validation"
            | "permanent"
            | null;
          duration_ms?: number | null;
          original_execution_id?: string | null;
          rollback_execution_id?: string | null;
          rollback_reason?: string | null;
          rolled_back_at?: string | null;
          retryable?: boolean;
          next_retry_at?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          action_id?: string;
          workspace_id?: string;
          user_id?: string;
          actor_type?: "user" | "system" | "ai";
          provider?: string | null;
          attempt_no?: number;
          idempotency_key?: string | null;
          state?:
            | "not_requested"
            | "queued"
            | "validating"
            | "running"
            | "succeeded"
            | "failed"
            | "cancelled"
            | "rollback_requested"
            | "rolling_back"
            | "rolled_back"
            | "rollback_failed";
          dry_run?: boolean;
          request_payload?: Json | null;
          prior_state?: Json | null;
          result?: Json | null;
          provider_request_id?: string | null;
          error_code?: string | null;
          error_message?: string | null;
          error_class?:
            | "transient"
            | "rate_limited"
            | "auth"
            | "validation"
            | "permanent"
            | null;
          duration_ms?: number | null;
          original_execution_id?: string | null;
          rollback_execution_id?: string | null;
          rollback_reason?: string | null;
          rolled_back_at?: string | null;
          retryable?: boolean;
          next_retry_at?: string | null;
          started_at?: string | null;
          completed_at?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      action_audit_log: {
        Relationships: [];
        Row: {
          id: string;
          action_id: string;
          execution_id: string | null;
          workspace_id: string;
          user_id: string;
          actor_type: "user" | "system" | "ai";
          event:
            | "execute_requested"
            | "queued"
            | "validating"
            | "execution_started"
            | "execution_succeeded"
            | "execution_failed"
            | "retry_scheduled"
            | "cancelled"
            | "rolled_back"
            | "dry_run_halted"
            | "rollback_requested"
            | "rollback_started"
            | "rollback_completed"
            | "rollback_failed";
          from_state: string | null;
          to_state: string | null;
          detail: Json | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          action_id: string;
          execution_id?: string | null;
          workspace_id: string;
          user_id: string;
          actor_type?: "user" | "system" | "ai";
          event:
            | "execute_requested"
            | "queued"
            | "validating"
            | "execution_started"
            | "execution_succeeded"
            | "execution_failed"
            | "retry_scheduled"
            | "cancelled"
            | "rolled_back"
            | "dry_run_halted"
            | "rollback_requested"
            | "rollback_started"
            | "rollback_completed"
            | "rollback_failed";
          from_state?: string | null;
          to_state?: string | null;
          detail?: Json | null;
          created_at?: string;
        };
        // No Update shape: the audit log is append-only (RLS denies UPDATE).
        Update: Record<string, never>;
      };
      workspace_memory: {
        Relationships: [];
        Row: {
          id: string;
          workspace_id: string;
          content: string;
          source: "user" | "ai";
          created_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          content: string;
          source?: "user" | "ai";
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          content?: string;
          source?: "user" | "ai";
          created_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      workspace_settings: {
        Relationships: [];
        Row: {
          id: string;
          workspace_id: string;
          ai_insights_enabled: boolean;
          action_engine_enabled: boolean;
          scheduled_actions_enabled: boolean;
          autonomous_ai_enabled: boolean;
          beta_features_enabled: boolean;
          timezone: string;
          currency: string;
          date_format: "YYYY-MM-DD" | "MM/DD/YYYY" | "DD/MM/YYYY" | "D MMM YYYY";
          notify_email: boolean;
          notify_in_app: boolean;
          notify_failed_sync: boolean;
          notify_ai_opportunities: boolean;
          environment: "production" | "sandbox";
          last_saved_by: string | null;
          created_at: string;
          updated_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          ai_insights_enabled?: boolean;
          action_engine_enabled?: boolean;
          scheduled_actions_enabled?: boolean;
          autonomous_ai_enabled?: boolean;
          beta_features_enabled?: boolean;
          timezone?: string;
          currency?: string;
          date_format?: "YYYY-MM-DD" | "MM/DD/YYYY" | "DD/MM/YYYY" | "D MMM YYYY";
          notify_email?: boolean;
          notify_in_app?: boolean;
          notify_failed_sync?: boolean;
          notify_ai_opportunities?: boolean;
          environment?: "production" | "sandbox";
          last_saved_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          ai_insights_enabled?: boolean;
          action_engine_enabled?: boolean;
          scheduled_actions_enabled?: boolean;
          autonomous_ai_enabled?: boolean;
          beta_features_enabled?: boolean;
          timezone?: string;
          currency?: string;
          date_format?: "YYYY-MM-DD" | "MM/DD/YYYY" | "DD/MM/YYYY" | "D MMM YYYY";
          notify_email?: boolean;
          notify_in_app?: boolean;
          notify_failed_sync?: boolean;
          notify_ai_opportunities?: boolean;
          environment?: "production" | "sandbox";
          last_saved_by?: string | null;
          created_at?: string;
          updated_at?: string;
        };
      };
      ai_usage: {
        Relationships: [];
        Row: {
          id: string;
          workspace_id: string;
          user_id: string;
          model: string;
          escalated: boolean;
          route_reason: string | null;
          input_tokens: number;
          output_tokens: number;
          tool_rounds: number;
          stop_reason: string | null;
          created_at: string;
        };
        Insert: {
          id?: string;
          workspace_id: string;
          user_id: string;
          model: string;
          escalated?: boolean;
          route_reason?: string | null;
          input_tokens?: number;
          output_tokens?: number;
          tool_rounds?: number;
          stop_reason?: string | null;
          created_at?: string;
        };
        Update: {
          id?: string;
          workspace_id?: string;
          user_id?: string;
          model?: string;
          escalated?: boolean;
          route_reason?: string | null;
          input_tokens?: number;
          output_tokens?: number;
          tool_rounds?: number;
          stop_reason?: string | null;
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
export type ActionQueueRow =
  Database["public"]["Tables"]["action_queue"]["Row"];
export type ActionQueueInsert =
  Database["public"]["Tables"]["action_queue"]["Insert"];
export type ActionQueueUpdate =
  Database["public"]["Tables"]["action_queue"]["Update"];
export type ActionExecutionRow =
  Database["public"]["Tables"]["action_executions"]["Row"];
export type ActionExecutionInsert =
  Database["public"]["Tables"]["action_executions"]["Insert"];
export type ActionExecutionUpdate =
  Database["public"]["Tables"]["action_executions"]["Update"];
export type ActionAuditLogRow =
  Database["public"]["Tables"]["action_audit_log"]["Row"];
export type ActionAuditLogInsert =
  Database["public"]["Tables"]["action_audit_log"]["Insert"];
export type WorkspaceMemoryRow =
  Database["public"]["Tables"]["workspace_memory"]["Row"];
export type WorkspaceSettingsRow =
  Database["public"]["Tables"]["workspace_settings"]["Row"];
export type WorkspaceSettingsInsert =
  Database["public"]["Tables"]["workspace_settings"]["Insert"];
export type WorkspaceSettingsUpdate =
  Database["public"]["Tables"]["workspace_settings"]["Update"];
export type AiUsageRow = Database["public"]["Tables"]["ai_usage"]["Row"];
export type AiUsageInsert =
  Database["public"]["Tables"]["ai_usage"]["Insert"];
export type AiUsageUpdate =
  Database["public"]["Tables"]["ai_usage"]["Update"];
