'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { api } from '@/lib/api';
import type { Statistics, Account } from '@/types';
import { useToast } from '@/components/Toast';

export default function Home() {
  const [stats, setStats] = useState<Statistics | null>(null);
  const [accounts, setAccounts] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState(false);
  const [checking, setChecking] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [checkResult, setCheckResult] = useState<any>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [seatFilter, setSeatFilter] = useState<string>('all');
  const { showToast } = useToast();

  useEffect(() => {
    loadStatistics();
    loadAccounts();
  }, []);

  const loadStatistics = async () => {
    try {
      const response = await api.getStatistics();
      if (response.success) {
        setStats(response.data);
      }
    } catch (error) {
      console.error('Failed to load statistics:', error);
    } finally {
      setLoading(false);
    }
  };

  const loadAccounts = async () => {
    try {
      const response = await api.getAccounts({ limit: 100 });
      if (response.success) {
        setAccounts(response.data);
      }
    } catch (error) {
      console.error('Failed to load accounts:', error);
    }
  };

  const handleCheckData = async () => {
    setChecking(true);
    setCheckResult(null);

    try {
      const response = await api.checkGoogleSheet();

      if (response.success) {
        setCheckResult(response);
        
        const unprocessed = response.data.emails_not_in_db;
        const processed = response.data.emails_in_db;
        
        showToast(
          `Kết quả kiểm tra: ${response.data.total_emails} email, ${processed} đã có, ${unprocessed} chưa có`,
          unprocessed > 0 ? 'info' : 'success'
        );
      } else {
        showToast(response.error, 'error');
      }
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setChecking(false);
    }
  };

  const handleLoginFromSheet = async () => {
    if (!confirm('Bạn có chắc muốn đọc email từ Google Sheet và login?')) {
      return;
    }

    setProcessing(true);
    setResult(null);

    try {
      const response = await api.loginFromGoogleSheet({});

      if (response.success) {
        setResult(response);
        showToast(`Thành công! Tổng: ${response.total}, Thành công: ${response.processed}, Thất bại: ${response.failed}`, 'success');
        
        // Reload statistics and accounts list
        loadStatistics();
        loadAccounts();
      } else {
        showToast(response.error, 'error');
      }
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setProcessing(false);
    }
  };

  const handleRefreshUsers = async (accountId: string) => {
    try {
      const response = await api.refreshAccountUsers(accountId);
      
      if (response.success) {
        // Update local state immediately
        setAccounts(prevAccounts => 
          prevAccounts.map(acc => 
            acc._id === accountId 
              ? { ...acc, total_users: response.data.total_users }
              : acc
          )
        );
        
        showToast(`Đã cập nhật: ${response.data.total_users} users`, 'success');
      } else {
        showToast(response.error, 'error');
      }
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const handleDeleteAccount = async (accountId: string) => {
    try {
      const response = await api.deleteAccount(accountId);
      
      if (response.success) {
        // Remove from local state immediately
        setAccounts(prevAccounts => prevAccounts.filter(acc => acc._id !== accountId));
        
        // Reload statistics in background
        loadStatistics();
        
        showToast('Đã xóa account thành công!', 'success');
      } else {
        showToast(response.error, 'error');
      }
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const handleInviteUser = async (accountId: string, email: string) => {
    try {
      const response = await api.inviteUserToTeam(accountId, email);
      
      if (response.success) {
        // Update local state immediately if total_users is returned
        if (response.data.total_users !== null && response.data.total_users !== undefined) {
          setAccounts(prevAccounts => 
            prevAccounts.map(acc => 
              acc._id === accountId 
                ? { ...acc, total_users: response.data.total_users }
                : acc
            )
          );
        }
        
        showToast(`Đã mời ${email} vào team thành công!`, 'success');
      } else {
        showToast(response.error, 'error');
      }
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  // Filter accounts by search query
  const filteredAccounts = accounts.filter(account => 
    account.email.toLowerCase().includes(searchQuery.toLowerCase())
  );

  // Filter by seats
  const filteredBySeat = filteredAccounts.filter(account => {
    if (seatFilter === 'all') return true;
    
    const totalUsers = account.total_users || 0;
    const totalSeats = account.subscription?.seats || 5;
    
    switch (seatFilter) {
      case 'empty': // 0 users
        return totalUsers === 0;
      case 'low': // 1-2 users
        return totalUsers >= 1 && totalUsers <= 2;
      case 'medium': // 3-4 users
        return totalUsers >= 3 && totalUsers <= 4;
      case 'full': // >= 5 users hoặc full seats
        return totalUsers >= totalSeats;
      default:
        return true;
    }
  });

  // Separate accounts by type
  const personalAccounts = filteredBySeat.filter(acc => acc.account_type === 'Personal');
  const teamAccounts = filteredBySeat.filter(acc => acc.account_type === 'Team');

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-6">
          <h1 className="text-3xl font-bold text-gray-900">
            ChatGPT Account Manager
          </h1>
        </div>
      </header>

      {/* Main Content */}
      <main className="max-w-[1920px] mx-auto px-6 sm:px-8 lg:px-12 py-8">
        {/* Statistics Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-8 mb-10">
          <StatCard
            title="Total Accounts"
            value={stats?.total_accounts || 0}
            loading={loading}
            color="blue"
          />
          <StatCard
            title="Active Accounts"
            value={stats?.active_accounts || 0}
            loading={loading}
            color="green"
          />
          <StatCard
            title="Pending Accounts"
            value={stats?.pending_accounts || 0}
            loading={loading}
            color="yellow"
          />
          <StatCard
            title="Banned Accounts"
            value={stats?.banned_accounts || 0}
            loading={loading}
            color="red"
          />
        </div>

        {/* Quick Actions */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-10">
          <h2 className="text-2xl font-bold mb-6 text-gray-900">Quick Actions</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <button
              onClick={handleCheckData}
              disabled={checking}
              className={`flex items-center justify-center px-8 py-5 rounded-xl transition text-lg font-semibold ${
                checking
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-purple-600 hover:bg-purple-700 text-white shadow-md hover:shadow-lg'
              }`}
            >
              {checking ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Checking...</span>
                </>
              ) : (
                <span>Check Data</span>
              )}
            </button>
            
            <button
              onClick={handleLoginFromSheet}
              disabled={processing}
              className={`flex items-center justify-center px-8 py-5 rounded-xl transition text-lg font-semibold ${
                processing
                  ? 'bg-gray-400 cursor-not-allowed'
                  : 'bg-green-600 hover:bg-green-700 text-white shadow-md hover:shadow-lg'
              }`}
            >
              {processing ? (
                <>
                  <svg className="animate-spin -ml-1 mr-3 h-6 w-6 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Processing...</span>
                </>
              ) : (
                <span>Login New Account</span>
              )}
            </button>
            
            <Link
              href="/logs"
              className="flex items-center justify-center px-8 py-5 bg-gray-600 text-white rounded-xl hover:bg-gray-700 transition text-lg font-semibold shadow-md hover:shadow-lg"
            >
              <span>View Logs</span>
            </Link>
          </div>
        </div>

        {/* Accounts Grid */}
        <div className="bg-white rounded-xl shadow-lg p-8 mb-10">
          <div className="flex items-center justify-between mb-8">
            <h2 className="text-2xl font-bold text-gray-900">Accounts</h2>
            
            <div className="flex items-center gap-4">
              {/* Seat Filter */}
              <select
                value={seatFilter}
                onChange={(e) => setSeatFilter(e.target.value)}
                className="px-4 py-4 text-base font-bold border-2 border-gray-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-md bg-white cursor-pointer text-gray-800"
                style={{ minWidth: '200px' }}
              >
                <option value="all" className="font-bold text-gray-800">🔢 Tất cả seats</option>
                <option value="empty" className="font-bold text-gray-800">⚪ Trống (0 users)</option>
                <option value="low" className="font-bold text-gray-800">🟢 Ít (1-2 users)</option>
                <option value="medium" className="font-bold text-gray-800">🟡 Vừa (3-4 users)</option>
                <option value="full" className="font-bold text-gray-800">🔴 Đầy (≥5 users)</option>
              </select>

              {/* Search Bar */}
              <div className="relative w-96">
              <input
                type="text"
                placeholder="🔍 Tìm kiếm theo email..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="w-full pl-14 pr-12 py-4 text-base font-medium border-2 border-gray-400 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-blue-500 shadow-md placeholder:text-gray-500"
              />
              <svg 
                className="absolute left-4 top-1/2 transform -translate-y-1/2 w-6 h-6 text-gray-500"
                fill="none" 
                stroke="currentColor" 
                viewBox="0 0 24 24"
              >
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
              {searchQuery && (
                <button
                  onClick={() => setSearchQuery('')}
                  className="absolute right-4 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-full p-1"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              )}
            </div>
            </div>
          </div>

          {filteredBySeat.length === 0 ? (
            <p className="text-gray-500 text-center py-12 text-lg">
              {searchQuery || seatFilter !== 'all' ? 'Không tìm thấy account nào' : 'No accounts found'}
            </p>
          ) : (
            <div className="space-y-10">
              {/* Team Accounts Section */}
              {teamAccounts.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <h3 className="text-xl font-bold text-gray-900">Team Accounts</h3>
                    <span className="px-3 py-1 text-sm font-bold bg-blue-100 text-blue-800 rounded-full">
                      {teamAccounts.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                    {teamAccounts.map((account) => (
                      <AccountCard 
                        key={account._id} 
                        account={account} 
                        onRefresh={handleRefreshUsers}
                        onDelete={handleDeleteAccount}
                        onInviteUser={handleInviteUser}
                      />
                    ))}
                  </div>
                </div>
              )}

              {/* Personal Accounts Section */}
              {personalAccounts.length > 0 && (
                <div>
                  <div className="flex items-center gap-3 mb-6">
                    <h3 className="text-xl font-bold text-gray-900">Personal Accounts (Cá nhân)</h3>
                    <span className="px-3 py-1 text-sm font-bold bg-purple-100 text-purple-800 rounded-full">
                      {personalAccounts.length}
                    </span>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5 gap-6">
                    {personalAccounts.map((account) => (
                      <AccountCard 
                        key={account._id} 
                        account={account} 
                        onRefresh={handleRefreshUsers}
                        onDelete={handleDeleteAccount}
                        onInviteUser={handleInviteUser}
                      />
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}
        </div>

        {/* Check Result */}
        {checkResult && (
          <div className="bg-white rounded-xl shadow-lg p-8 mb-10">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">📊 Kết quả kiểm tra Sheet</h2>
            <div className="grid grid-cols-3 gap-6 mb-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-3xl font-bold text-blue-600">{checkResult.data.total_emails}</p>
                <p className="text-base font-medium text-gray-600 mt-2">Tổng email</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-3xl font-bold text-green-600">{checkResult.data.emails_in_db}</p>
                <p className="text-base font-medium text-gray-600 mt-2">Đã có trong DB</p>
              </div>
              <div className="text-center p-4 bg-orange-50 rounded-lg">
                <p className="text-3xl font-bold text-orange-600">{checkResult.data.emails_not_in_db}</p>
                <p className="text-base font-medium text-gray-600 mt-2">Chưa có trong DB</p>
              </div>
            </div>
            
            {checkResult.data.unprocessed_emails && checkResult.data.unprocessed_emails.length > 0 && (
              <div className="mt-6">
                <h3 className="font-bold text-lg mb-3 text-gray-900">Email chưa xử lý (10 email đầu):</h3>
                <ul className="list-disc list-inside text-base text-gray-700 space-y-1">
                  {checkResult.data.unprocessed_emails.map((item: any, index: number) => (
                    <li key={index}>Row {item.row}: {item.email}</li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        )}

        {/* Login Result */}
        {result && (
          <div className="bg-white rounded-xl shadow-lg p-8 mb-10">
            <h2 className="text-2xl font-bold mb-6 text-gray-900">✅ Kết quả xử lý</h2>
            <div className="grid grid-cols-3 gap-6 mb-6">
              <div className="text-center p-4 bg-blue-50 rounded-lg">
                <p className="text-3xl font-bold text-blue-600">{result.total}</p>
                <p className="text-base font-medium text-gray-600 mt-2">Tổng</p>
              </div>
              <div className="text-center p-4 bg-green-50 rounded-lg">
                <p className="text-3xl font-bold text-green-600">{result.processed}</p>
                <p className="text-base font-medium text-gray-600 mt-2">Thành công</p>
              </div>
              <div className="text-center p-4 bg-red-50 rounded-lg">
                <p className="text-3xl font-bold text-red-600">{result.failed}</p>
                <p className="text-base font-medium text-gray-600 mt-2">Thất bại</p>
              </div>
            </div>
            
            {result.results && result.results.length > 0 && (
              <div className="mt-6">
                <h3 className="font-bold text-lg mb-3 text-gray-900">Chi tiết:</h3>
                <div className="max-h-64 overflow-y-auto">
                  <table className="min-w-full divide-y divide-gray-200">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Email</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Row</th>
                        <th className="px-4 py-2 text-left text-xs font-medium text-gray-500 uppercase">Status</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {result.results.map((item: any, index: number) => (
                        <tr key={index}>
                          <td className="px-4 py-2 text-sm">{item.email}</td>
                          <td className="px-4 py-2 text-sm">{item.row_index}</td>
                          <td className="px-4 py-2 text-sm">
                            {item.status === 'success' ? (
                              <span className="text-green-600">✓ Success</span>
                            ) : (
                              <span className="text-red-600">✗ {item.error}</span>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Info */}
        <div className="bg-white rounded-xl shadow-lg p-8">
          <h2 className="text-2xl font-bold mb-6 text-gray-900">About</h2>
          <p className="text-base text-gray-700 mb-6 leading-relaxed">
            ChatGPT Account Manager helps you manage multiple ChatGPT accounts with ease.
            Features include:
          </p>
          <ul className="list-disc list-inside text-base text-gray-700 space-y-3">
            <li>Automatic login with OTP from TempMail</li>
            <li>Session management and storage in MongoDB</li>
            <li>Multi-workspace support</li>
            <li>Account status tracking</li>
            <li>Activity logs</li>
            <li>Google Sheet integration (read emails, write results)</li>
          </ul>
        </div>
      </main>
    </div>
  );
}

function AccountCard({ account, onRefresh, onDelete, onInviteUser }: { 
  account: Account; 
  onRefresh: (accountId: string) => void; 
  onDelete: (accountId: string) => void;
  onInviteUser: (accountId: string, email: string) => void;
}) {
  const [refreshing, setRefreshing] = useState(false);
  const [deleting, setDeleting] = useState(false);
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [showManageInvitesModal, setShowManageInvitesModal] = useState(false);
  const [showDetailsModal, setShowDetailsModal] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviting, setInviting] = useState(false);
  const [pendingInvites, setPendingInvites] = useState<any[]>([]);
  const [loadingInvites, setLoadingInvites] = useState(false);
  const [loadingPassword, setLoadingPassword] = useState(false);
  const [password, setPassword] = useState<string | null>(null);
  const [saleStatus, setSaleStatus] = useState<'sold' | 'available'>(account.sale_status || 'available');
  const [updatingSaleStatus, setUpdatingSaleStatus] = useState(false);
  const [checkingBan, setCheckingBan] = useState(false);
  const { showToast } = useToast();

  const statusColors = {
    active: 'bg-green-100 text-green-800',
    pending: 'bg-yellow-100 text-yellow-800',
    banned: 'bg-red-100 text-red-800',
    expired: 'bg-gray-100 text-gray-800',
  };

  const planColors = {
    Team: 'bg-blue-100 text-blue-800',
    Personal: 'bg-purple-100 text-purple-800',
  };

  // Calculate seats usage
  const totalSeats = account.subscription?.seats || 5;
  const usedSeats = account.total_users || 0;
  const seatsDisplay = `${usedSeats}/${totalSeats}`;

  const handleRefresh = async () => {
    setRefreshing(true);
    try {
      await onRefresh(account._id);
    } finally {
      setRefreshing(false);
    }
  };

  const handleDelete = async () => {
    if (!confirm(`Bạn có chắc muốn xóa account ${account.email}?\n\nThao tác này sẽ xóa:\n- Account\n- Session\n- Logs\n\nKhông thể hoàn tác!`)) {
      return;
    }

    setDeleting(true);
    try {
      await onDelete(account._id);
    } finally {
      setDeleting(false);
    }
  };

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!inviteEmail || !inviteEmail.includes('@')) {
      showToast('Vui lòng nhập email hợp lệ', 'warning');
      return;
    }

    setInviting(true);
    try {
      await onInviteUser(account._id, inviteEmail);
      setInviteEmail('');
      setShowInviteModal(false);
    } finally {
      setInviting(false);
    }
  };

  const loadPendingInvites = async () => {
    setLoadingInvites(true);
    try {
      const response = await api.getPendingInvites(account._id);
      if (response.success) {
        setPendingInvites(response.data.invites);
      } else {
        showToast(response.error, 'error');
      }
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setLoadingInvites(false);
    }
  };

  const handleManageInvites = () => {
    setShowManageInvitesModal(true);
    loadPendingInvites();
  };

  const handleResendInvite = async (email: string) => {
    try {
      const response = await api.resendInvite(account._id, email);
      if (response.success) {
        showToast(`Đã gửi lại lời mời cho ${email}`, 'success');
      } else {
        showToast(response.error, 'error');
      }
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const handleDeleteInvite = async (email: string) => {
    if (!confirm(`Xóa lời mời cho ${email}?`)) {
      return;
    }

    try {
      const response = await api.deleteInvite(account._id, email);
      if (response.success) {
        // Remove from local state immediately for instant feedback
        setPendingInvites(prev => prev.filter(inv => inv.email_address !== email));
        showToast('Đã xóa lời mời', 'success');
      } else {
        showToast(response.error, 'error');
      }
    } catch (error: any) {
      showToast(error.message, 'error');
    }
  };

  const handleCardClick = async (e: React.MouseEvent) => {
    // Ignore clicks on buttons
    if ((e.target as HTMLElement).closest('button')) {
      return;
    }
    
    setShowDetailsModal(true);
    
    // Load password from Google Sheet
    if (!password) {
      setLoadingPassword(true);
      try {
        const response = await api.getAccountPassword(account._id);
        if (response.success) {
          setPassword(response.data.password);
        } else {
          setPassword('N/A');
        }
      } catch (error: any) {
        setPassword('N/A');
      } finally {
        setLoadingPassword(false);
      }
    }
  };

  const copyToClipboard = (text: string, label: string) => {
    navigator.clipboard.writeText(text);
    showToast(`Đã copy ${label}!`, 'success');
  };

  const handleSaleStatusChange = async (newStatus: 'sold' | 'available') => {
    setUpdatingSaleStatus(true);
    try {
      const response = await api.updateSaleStatus(account._id, newStatus);
      if (response.success) {
        setSaleStatus(newStatus);
        showToast(`Đã cập nhật: ${newStatus === 'sold' ? 'Đã Bán' : 'Chưa Bán'}`, 'success');
      } else {
        showToast(response.error, 'error');
      }
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setUpdatingSaleStatus(false);
    }
  };

  const handleCheckBan = async () => {
    setCheckingBan(true);
    try {
      const response = await api.checkAccountBan(account._id);
      
      if (response.success) {
        const isBanned = response.data.is_banned;
        
        if (isBanned) {
          showToast('⚠️ Account bị BAN/DEACTIVATED!', 'error');
          // Reload page để cập nhật status
          window.location.reload();
        } else {
          showToast('✅ Account hoạt động bình thường!', 'success');
        }
      } else {
        showToast(response.error, 'error');
      }
    } catch (error: any) {
      showToast(error.message, 'error');
    } finally {
      setCheckingBan(false);
    }
  };

  return (
    <>
      <div 
        className="border-2 border-gray-200 rounded-xl p-6 hover:shadow-xl transition-all relative cursor-pointer hover:border-blue-300"
        onClick={handleCardClick}
      >
        {/* Delete button - top right corner */}
        <button
          onClick={handleDelete}
          disabled={deleting}
          className={`absolute top-3 right-3 p-2 rounded-lg transition ${
            deleting
              ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
              : 'text-gray-400 hover:text-red-600 hover:bg-red-50'
          }`}
          title="Xóa account"
        >
          {deleting ? (
            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
            </svg>
          ) : (
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
            </svg>
          )}
        </button>

        <div className="flex items-start justify-between mb-4 pr-10">
          <div className="flex-1 min-w-0">
            <p className="text-base font-semibold text-gray-900 truncate" title={account.email}>
              {account.email}
            </p>
          </div>
          <span className={`ml-2 px-3 py-1 text-sm font-semibold rounded-full ${statusColors[account.status]}`}>
            {account.status}
          </span>
        </div>
        
        <div className="space-y-3">
          {/* Sale Status Dropdown */}
          <div className="relative">
            <select
              value={saleStatus}
              onChange={(e) => handleSaleStatusChange(e.target.value as 'sold' | 'available')}
              disabled={updatingSaleStatus}
              onClick={(e) => e.stopPropagation()}
              className={`w-full px-4 py-2 text-sm font-semibold rounded-lg border-2 transition cursor-pointer ${
                saleStatus === 'sold'
                  ? 'bg-green-50 border-green-300 text-green-700'
                  : 'bg-orange-50 border-orange-300 text-orange-700'
              } ${updatingSaleStatus ? 'opacity-50 cursor-not-allowed' : 'hover:shadow-md'}`}
            >
              <option value="available">🔴 Chưa Bán</option>
              <option value="sold">✅ Đã Bán</option>
            </select>
          </div>

          {/* Only show Seats for Team accounts */}
          {account.account_type === 'Team' && (
            <div className="flex items-center justify-between text-base">
              <span className="text-gray-600 font-medium">Seats:</span>
              <span className="font-bold text-gray-900 text-lg">{seatsDisplay}</span>
            </div>
          )}
          
          <div className="flex items-center justify-between text-base">
            <span className="text-gray-600 font-medium">Plan:</span>
            <span className={`px-3 py-1 text-sm font-semibold rounded-lg ${planColors[account.account_type]}`}>
              {account.account_type === 'Personal' ? 'Cá nhân' : 'Team'}
            </span>
          </div>
        </div>

        <div className="mt-4 space-y-3">
          {/* Only show Refresh Users button for Team accounts */}
          {account.account_type === 'Team' && (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={handleRefresh}
                disabled={refreshing || account.status !== 'active'}
                className={`flex items-center justify-center px-4 py-3 text-sm font-semibold rounded-lg transition ${
                  refreshing || account.status !== 'active'
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-blue-50 text-blue-600 hover:bg-blue-100'
                }`}
                title={account.status !== 'active' ? 'Account must be active to refresh' : 'Refresh user count'}
              >
                {refreshing ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Refreshing...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                    </svg>
                    Refresh
                  </>
                )}
              </button>

              <button
                onClick={handleCheckBan}
                disabled={checkingBan}
                className={`flex items-center justify-center px-4 py-3 text-sm font-semibold rounded-lg transition ${
                  checkingBan
                    ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    : 'bg-red-50 text-red-600 hover:bg-red-100'
                }`}
                title="Kiểm tra account có bị ban không"
              >
                {checkingBan ? (
                  <>
                    <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                    </svg>
                    Checking...
                  </>
                ) : (
                  <>
                    <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                    </svg>
                    Check Ban
                  </>
                )}
              </button>
            </div>
          )}

          {/* For Personal accounts, show Check Ban button full width */}
          {account.account_type === 'Personal' && (
            <button
              onClick={handleCheckBan}
              disabled={checkingBan}
              className={`w-full flex items-center justify-center px-4 py-3 text-sm font-semibold rounded-lg transition ${
                checkingBan
                  ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                  : 'bg-red-50 text-red-600 hover:bg-red-100'
              }`}
              title="Kiểm tra account có bị ban không"
            >
              {checkingBan ? (
                <>
                  <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  Checking...
                </>
              ) : (
                <>
                  <svg className="w-4 h-4 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                  Check Ban
                </>
              )}
            </button>
          )}

          {/* Add User button - only for Team accounts */}
          {account.account_type === 'Team' && account.status === 'active' && (
            <div className="grid grid-cols-2 gap-3">
              <button
                onClick={() => setShowInviteModal(true)}
                className="flex items-center justify-center px-4 py-3 text-sm font-semibold rounded-lg transition bg-green-50 text-green-600 hover:bg-green-100"
                title="Mời user vào team"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18 9v3m0 0v3m0-3h3m-3 0h-3m-2-5a4 4 0 11-8 0 4 4 0 018 0zM3 20a6 6 0 0112 0v1H3v-1z" />
                </svg>
                Add User
              </button>
              <button
                onClick={handleManageInvites}
                className="flex items-center justify-center px-4 py-3 text-sm font-semibold rounded-lg transition bg-orange-50 text-orange-600 hover:bg-orange-100"
                title="Quản lý lời mời"
              >
                <svg className="w-4 h-4 mr-1" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                Invites
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowInviteModal(false)}>
          <div className="bg-white rounded-lg p-6 max-w-md w-full mx-4" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Mời user vào team</h3>
            <form onSubmit={handleInviteSubmit}>
              <div className="mb-4">
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Email
                </label>
                <input
                  type="email"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                  disabled={inviting}
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => setShowInviteModal(false)}
                  disabled={inviting}
                  className="flex-1 px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200 disabled:opacity-50"
                >
                  Hủy
                </button>
                <button
                  type="submit"
                  disabled={inviting}
                  className="flex-1 px-4 py-2 text-sm font-medium text-white bg-green-600 rounded-md hover:bg-green-700 disabled:opacity-50 flex items-center justify-center"
                >
                  {inviting ? (
                    <>
                      <svg className="animate-spin -ml-1 mr-2 h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      Đang mời...
                    </>
                  ) : (
                    'Mời'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Manage Invites Modal */}
      {showManageInvitesModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50" onClick={() => setShowManageInvitesModal(false)}>
          <div className="bg-white rounded-lg p-6 max-w-2xl w-full mx-4 max-h-[80vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <h3 className="text-lg font-semibold mb-4">Quản lý lời mời đang chờ</h3>
            
            {loadingInvites ? (
              <div className="flex justify-center py-8">
                <svg className="animate-spin h-8 w-8 text-blue-600" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
              </div>
            ) : pendingInvites.length === 0 ? (
              <p className="text-gray-500 text-center py-8">Không có lời mời nào đang chờ</p>
            ) : (
              <div className="space-y-3">
                {pendingInvites.map((invite) => (
                  <div key={invite.id} className="flex items-center justify-between p-3 border border-gray-200 rounded-lg">
                    <div className="flex-1">
                      <p className="text-sm font-medium text-gray-900">{invite.email_address}</p>
                      <p className="text-xs text-gray-500">Role: {invite.role}</p>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => handleResendInvite(invite.email_address)}
                        className="px-3 py-1 text-xs font-medium text-blue-600 bg-blue-50 rounded hover:bg-blue-100"
                        title="Gửi lại"
                      >
                        Resend
                      </button>
                      <button
                        onClick={() => handleDeleteInvite(invite.email_address)}
                        className="px-3 py-1 text-xs font-medium text-red-600 bg-red-50 rounded hover:bg-red-100"
                        title="Xóa"
                      >
                        Delete
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
            
            <div className="mt-4">
              <button
                onClick={() => setShowManageInvitesModal(false)}
                className="w-full px-4 py-2 text-sm font-medium text-gray-700 bg-gray-100 rounded-md hover:bg-gray-200"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Account Details Modal */}
      {showDetailsModal && (
        <div className="fixed inset-0 bg-white/30 backdrop-blur-sm flex items-center justify-center z-50" onClick={() => setShowDetailsModal(false)}>
          <div className="bg-white rounded-xl shadow-2xl p-8 max-w-lg w-full mx-4 border border-gray-200" onClick={(e) => e.stopPropagation()}>
            <div className="flex items-center justify-between mb-6">
              <h3 className="text-2xl font-bold text-gray-900">Chi tiết tài khoản</h3>
              <button
                onClick={() => setShowDetailsModal(false)}
                className="text-gray-400 hover:text-gray-600 transition"
              >
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            <div className="space-y-5">
              {/* Email */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Email</label>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    value={account.email}
                    readOnly
                    className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg bg-gray-50 text-base font-medium text-gray-900"
                  />
                  <button
                    onClick={() => copyToClipboard(account.email, 'email')}
                    className="p-3 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                    title="Copy email"
                  >
                    <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                    </svg>
                  </button>
                </div>
              </div>

              {/* Password */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Password</label>
                <div className="flex items-center gap-2">
                  {loadingPassword ? (
                    <div className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg bg-gray-50 text-base flex items-center">
                      <svg className="animate-spin h-5 w-5 text-gray-600 mr-2" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                      </svg>
                      <span className="font-medium text-gray-600">Loading...</span>
                    </div>
                  ) : (
                    <>
                      <input
                        type="text"
                        value={password || 'N/A'}
                        readOnly
                        className="flex-1 px-4 py-3 border-2 border-gray-300 rounded-lg bg-gray-50 text-base font-medium text-gray-900"
                      />
                      {password && password !== 'N/A' && (
                        <button
                          onClick={() => copyToClipboard(password, 'password')}
                          className="p-3 text-gray-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition"
                          title="Copy password"
                        >
                          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                        </button>
                      )}
                    </>
                  )}
                </div>
              </div>

              {/* Status */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Status</label>
                <span className={`inline-block px-4 py-2 text-base font-semibold rounded-lg ${
                  account.status === 'active' ? 'bg-green-100 text-green-800' :
                  account.status === 'pending' ? 'bg-yellow-100 text-yellow-800' :
                  account.status === 'banned' ? 'bg-red-100 text-red-800' :
                  'bg-gray-100 text-gray-800'
                }`}>
                  {account.status.toUpperCase()}
                </span>
              </div>

              {/* Plan Type */}
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">Plan</label>
                <div className="flex items-center gap-2">
                  <span className={`inline-block px-4 py-2 text-base font-semibold rounded-lg ${
                    account.account_type === 'Team' ? 'bg-blue-100 text-blue-800' : 'bg-purple-100 text-purple-800'
                  }`}>
                    {account.account_type === 'Personal' ? 'Cá nhân' : 'Team'}
                  </span>
                  {account.subscription?.plan_type && (
                    <span className="text-base font-medium text-gray-700">
                      ({account.subscription.plan_type})
                    </span>
                  )}
                </div>
              </div>

              {/* Seats - only for Team accounts */}
              {account.account_type === 'Team' && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Seats</label>
                  <div className="text-base">
                    <span className="font-bold text-gray-900 text-lg">
                      {account.total_users || 0} / {account.subscription?.seats || 5}
                    </span>
                    <span className="text-gray-600 ml-2 font-medium">users</span>
                  </div>
                </div>
              )}

              {/* User Info */}
              {account.name && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Name</label>
                  <p className="text-base font-medium text-gray-900">{account.name}</p>
                </div>
              )}

              {/* Last Login */}
              {account.last_login && (
                <div>
                  <label className="block text-sm font-semibold text-gray-700 mb-2">Last Login</label>
                  <p className="text-base font-medium text-gray-900">
                    {new Date(account.last_login).toLocaleString('vi-VN')}
                  </p>
                </div>
              )}
            </div>

            <div className="mt-8">
              <button
                onClick={() => setShowDetailsModal(false)}
                className="w-full px-6 py-3 text-base font-semibold text-white bg-blue-600 rounded-lg hover:bg-blue-700 transition shadow-md"
              >
                Đóng
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}

function StatCard({
  title,
  value,
  loading,
  color,
}: {
  title: string;
  value: number;
  loading: boolean;
  color: 'blue' | 'green' | 'yellow' | 'red';
}) {
  const colorClasses = {
    blue: 'text-blue-600',
    green: 'text-green-600',
    yellow: 'text-yellow-600',
    red: 'text-red-600',
  };

  return (
    <div className="bg-white rounded-xl shadow-lg p-8 hover:shadow-xl transition">
      <h3 className="text-base font-semibold text-gray-600 mb-3">{title}</h3>
      {loading ? (
        <div className="animate-pulse">
          <div className="h-12 bg-gray-200 rounded w-24"></div>
        </div>
      ) : (
        <div className={`text-5xl font-bold ${colorClasses[color]}`}>
          {value}
        </div>
      )}
    </div>
  );
}
