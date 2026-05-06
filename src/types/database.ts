export type Role = 'admin' | 'client'
export type ApprovalStatus = 'pending' | 'approved' | 'rejected'
export type NotificationType =
  | 'post_pending'
  | 'campaign_pending'
  | 'insight_pending'
  | 'approved'
  | 'rejected'
export type RefType = 'post' | 'campaign' | 'insight'

export type Database = {
  public: {
    Tables: {
      clients: {
        Row: {
          id: string
          name: string
          logo_url: string | null
          primary_color: string | null
          email: string | null
          created_at: string
        }
        Insert: {
          id?: string
          name: string
          logo_url?: string | null
          primary_color?: string | null
          email?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          name?: string
          logo_url?: string | null
          primary_color?: string | null
          email?: string | null
          created_at?: string
        }
        Relationships: []
      }
      users: {
        Row: {
          id: string
          auth_id: string
          client_id: string | null
          role: Role
          name: string
          email: string
          created_at: string
        }
        Insert: {
          id?: string
          auth_id: string
          client_id?: string | null
          role: Role
          name: string
          email: string
          created_at?: string
        }
        Update: {
          id?: string
          auth_id?: string
          client_id?: string | null
          role?: Role
          name?: string
          email?: string
          created_at?: string
        }
        Relationships: []
      }
      posts: {
        Row: {
          id: string
          client_id: string
          title: string
          caption: string | null
          media_url: string | null
          media_type: 'image' | 'video' | null
          scheduled_date: string
          status: ApprovalStatus
          comment: string | null
          reviewed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          title: string
          caption?: string | null
          media_url?: string | null
          media_type?: 'image' | 'video' | null
          scheduled_date: string
          status?: ApprovalStatus
          comment?: string | null
          reviewed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          title?: string
          caption?: string | null
          media_url?: string | null
          media_type?: 'image' | 'video' | null
          scheduled_date?: string
          status?: ApprovalStatus
          comment?: string | null
          reviewed_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      campaigns: {
        Row: {
          id: string
          client_id: string
          title: string
          description: string | null
          objective: string | null
          file_url: string | null
          status: ApprovalStatus
          comment: string | null
          reviewed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          title: string
          description?: string | null
          objective?: string | null
          file_url?: string | null
          status?: ApprovalStatus
          comment?: string | null
          reviewed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          title?: string
          description?: string | null
          objective?: string | null
          file_url?: string | null
          status?: ApprovalStatus
          comment?: string | null
          reviewed_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      insights: {
        Row: {
          id: string
          client_id: string
          title: string
          body: string
          specialist_name: string | null
          status: ApprovalStatus
          comment: string | null
          reviewed_at: string | null
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          title: string
          body: string
          specialist_name?: string | null
          status?: ApprovalStatus
          comment?: string | null
          reviewed_at?: string | null
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          title?: string
          body?: string
          specialist_name?: string | null
          status?: ApprovalStatus
          comment?: string | null
          reviewed_at?: string | null
          created_at?: string
        }
        Relationships: []
      }
      results: {
        Row: {
          id: string
          client_id: string
          period: string
          followers: number | null
          reach: number | null
          clicks: number | null
          conversions: number | null
          roi: number | null
          created_at: string
        }
        Insert: {
          id?: string
          client_id: string
          period: string
          followers?: number | null
          reach?: number | null
          clicks?: number | null
          conversions?: number | null
          roi?: number | null
          created_at?: string
        }
        Update: {
          id?: string
          client_id?: string
          period?: string
          followers?: number | null
          reach?: number | null
          clicks?: number | null
          conversions?: number | null
          roi?: number | null
          created_at?: string
        }
        Relationships: []
      }
      notifications: {
        Row: {
          id: string
          user_id: string
          type: NotificationType
          message: string
          ref_id: string | null
          ref_type: RefType | null
          read: boolean
          created_at: string
        }
        Insert: {
          id?: string
          user_id: string
          type: NotificationType
          message: string
          ref_id?: string | null
          ref_type?: RefType | null
          read?: boolean
          created_at?: string
        }
        Update: {
          id?: string
          user_id?: string
          type?: NotificationType
          message?: string
          ref_id?: string | null
          ref_type?: RefType | null
          read?: boolean
          created_at?: string
        }
        Relationships: []
      }
    }
    Views: { [_ in never]: never }
    Functions: { [_ in never]: never }
    Enums: {
      approval_status: ApprovalStatus
      role: Role
    }
    CompositeTypes: { [_ in never]: never }
  }
}
