/**
 * TypeScript Types for ChatGPT Account Manager
 */

export interface Account {
  _id: string;
  email: string;
  password: string;
  account_type: 'Team' | 'Personal';
  source: string;
  status: 'pending' | 'active' | 'banned' | 'expired';
  workspaces: Workspace[];
  subscription: Subscription;
  created_at: string;
  updated_at: string;
  last_login: string | null;
  ban_status: string;
  notes: string;
  user_id?: string;
  name?: string;
  email_verified?: boolean;
  total_users?: number;
  sale_status?: 'sold' | 'available';
}

export interface Workspace {
  id: string;
  name: string | null;
  kind: 'organization' | 'personal';
  profile_picture_alt_text?: string;
}

export interface Subscription {
  plan_type?: string;
  seats?: number;
  [key: string]: any;
}

export interface Session {
  _id: string;
  account_id: string;
  session_data: {
    access_token: string;
    user_id: string;
    account_id: string;
  };
  cookies: Record<string, string>;
  created_at: string;
  expires_at: string;
  is_valid: boolean;
}

export interface Log {
  _id: string;
  account_id: string;
  action: string;
  message: string;
  level: 'info' | 'warning' | 'error';
  created_at: string;
}

export interface Statistics {
  total_accounts: number;
  active_accounts: number;
  pending_accounts: number;
  banned_accounts: number;
  expired_accounts: number;
  total_sessions: number;
  total_logs: number;
}
