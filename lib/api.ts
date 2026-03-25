/**
 * API Client for ChatGPT Account Manager
 */

const API_BASE_URL = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';

interface ApiResponse<T = any> {
  success: boolean;
  data?: T;
  error?: string;
  message?: string;
}

class ApiClient {
  private baseUrl: string;

  constructor(baseUrl: string) {
    this.baseUrl = baseUrl;
  }

  private async request<T>(
    endpoint: string,
    options: RequestInit = {}
  ): Promise<ApiResponse<T>> {
    const url = `${this.baseUrl}${endpoint}`;
    
    const config: RequestInit = {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        ...options.headers,
      },
    };

    try {
      const response = await fetch(url, config);
      const data = await response.json();
      
      if (!response.ok) {
        throw new Error(data.error || 'API request failed');
      }
      
      return data;
    } catch (error) {
      console.error('API Error:', error);
      throw error;
    }
  }

  // Statistics
  async getStatistics() {
    return this.request('/api/statistics');
  }

  // Accounts
  async getAccounts(params?: { status?: string; limit?: number; skip?: number }) {
    const query = new URLSearchParams(params as any).toString();
    return this.request(`/api/accounts${query ? `?${query}` : ''}`);
  }

  async getAccount(accountId: string) {
    return this.request(`/api/accounts/${accountId}`);
  }

  async createAccount(data: {
    email: string;
    password?: string;
    account_type?: string;
    source?: string;
  }) {
    return this.request('/api/accounts', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }

  async updateAccount(accountId: string, data: any) {
    return this.request(`/api/accounts/${accountId}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
  }

  async deleteAccount(accountId: string) {
    return this.request(`/api/accounts/${accountId}`, {
      method: 'DELETE',
    });
  }

  async refreshAccountUsers(accountId: string) {
    return this.request(`/api/accounts/${accountId}/refresh-users`, {
      method: 'POST',
    });
  }

  async checkAccountBan(accountId: string) {
    return this.request(`/api/accounts/${accountId}/check-ban`, {
      method: 'POST',
    });
  }

  async inviteUserToTeam(accountId: string, email: string, role?: string, seatType?: string) {
    return this.request(`/api/accounts/${accountId}/invite-user`, {
      method: 'POST',
      body: JSON.stringify({
        email,
        role: role || 'standard-user',
        seat_type: seatType || 'default',
      }),
    });
  }

  async getPendingInvites(accountId: string) {
    return this.request(`/api/accounts/${accountId}/invites`);
  }

  async deleteInvite(accountId: string, email: string) {
    return this.request(`/api/accounts/${accountId}/invites/${encodeURIComponent(email)}`, {
      method: 'DELETE',
    });
  }

  async resendInvite(accountId: string, email: string) {
    return this.inviteUserToTeam(accountId, email);
  }

  async getAccountPassword(accountId: string) {
    return this.request(`/api/accounts/${accountId}/password`);
  }

  async updateSaleStatus(accountId: string, saleStatus: 'sold' | 'available') {
    return this.request(`/api/accounts/${accountId}/sale-status`, {
      method: 'PUT',
      body: JSON.stringify({ sale_status: saleStatus }),
    });
  }

  // Login
  async sendOTP(email: string, password?: string, account_type?: string) {
    return this.request('/api/login', {
      method: 'POST',
      body: JSON.stringify({ email, password, account_type }),
    });
  }

  async verifyOTP(accountId: string, otpCode: string) {
    return this.request('/api/login/verify-otp', {
      method: 'POST',
      body: JSON.stringify({ account_id: accountId, otp_code: otpCode }),
    });
  }

  async autoLoginWithOTP(email: string, password?: string, account_type?: string) {
    return this.request('/api/login/auto-otp', {
      method: 'POST',
      body: JSON.stringify({ email, password, account_type }),
    });
  }

  // Sessions
  async getSession(accountId: string) {
    return this.request(`/api/sessions/${accountId}`);
  }

  async invalidateSession(accountId: string) {
    return this.request(`/api/sessions/${accountId}`, {
      method: 'DELETE',
    });
  }

  // Logs
  async getLogs(accountId?: string, limit?: number) {
    const params = new URLSearchParams();
    if (accountId) params.append('account_id', accountId);
    if (limit) params.append('limit', limit.toString());
    
    return this.request(`/api/logs?${params.toString()}`);
  }

  // Google Sheet Integration
  async checkGoogleSheet() {
    return this.request('/api/gsheet/check');
  }

  async loginFromGoogleSheet(data: {
    service_account_file?: string;
    sheet_id?: string;
    sheet_name?: string;
    start_row?: number;
    max_rows?: number;
    password?: string;
    account_type?: string;
  }) {
    return this.request('/api/gsheet/login-batch', {
      method: 'POST',
      body: JSON.stringify(data),
    });
  }
}

export const api = new ApiClient(API_BASE_URL);
export type { ApiResponse };
