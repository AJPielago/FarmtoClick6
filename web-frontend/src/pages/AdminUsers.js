import React, { useEffect, useState, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import Navbar from '../components/Navbar';

const ROLE_OPTIONS = [
  { value: 'all',    label: 'All Roles',  icon: 'fas fa-layer-group' },
  { value: 'user',   label: 'Users',      icon: 'fas fa-user' },
  { value: 'farmer', label: 'Farmers',    icon: 'fas fa-seedling' },
  { value: 'admin',  label: 'Admins',     icon: 'fas fa-user-shield' },
  { value: 'rider',  label: 'Riders',     icon: 'fas fa-motorcycle' },
];

const ROLE_BADGE_COLORS = {
  admin:  { bg: '#ede9fe', color: '#6d28d9' },
  farmer: { bg: '#dcfce7', color: '#15803d' },
  rider:  { bg: '#e0f2fe', color: '#0369a1' },
  user:   { bg: '#fef3c7', color: '#92400e' },
};

const AdminUsers = () => {
  const { user, isLoading: authLoading } = useAuth();
  const navigate = useNavigate();

  const [users, setUsers] = useState([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const [roleFilter, setRoleFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [stats, setStats] = useState({
    total: 0,
    active: 0,
    inactive: 0,
    roleCounts: {},
  });
  const [togglingId, setTogglingId] = useState(null);

  /* ───── Fetch users ───── */
  const loadUsers = useCallback(async (role, search) => {
    try {
      setIsLoading(true);
      setError('');
      const token = localStorage.getItem('userToken');
      const params = new URLSearchParams();
      if (role && role !== 'all') params.append('role', role);
      if (search) params.append('search', search);

      const res = await fetch(
        `http://localhost:5001/api/admin/users?${params.toString()}`,
        {
          headers: { Authorization: token ? `Bearer ${token}` : '' },
          credentials: 'include',
        }
      );

      if (!res.ok) {
        const errData = await res.json().catch(() => ({}));
        throw new Error(errData.error || 'Failed to load users');
      }

      const data = await res.json();
      setUsers(data.users || []);
      setStats({
        total: data.total_count || 0,
        active: data.active_count || 0,
        inactive: data.inactive_count || 0,
        roleCounts: data.role_counts || {},
      });
    } catch (err) {
      setError(err.message || 'Failed to load users');
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    if (authLoading) return;
    if (user && user.is_admin) {
      loadUsers(roleFilter, searchQuery);
    } else {
      navigate('/');
    }
  }, [user, navigate, authLoading, roleFilter]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ───── Debounced search ───── */
  useEffect(() => {
    const timeout = setTimeout(() => {
      if (!authLoading && user && user.is_admin) {
        loadUsers(roleFilter, searchQuery);
      }
    }, 400);
    return () => clearTimeout(timeout);
  }, [searchQuery]); // eslint-disable-line react-hooks/exhaustive-deps

  /* ───── Toggle activate / deactivate ───── */
  const handleToggleStatus = async (userId, currentStatus) => {
    const action = currentStatus ? 'deactivate' : 'activate';
    if (!window.confirm(`Are you sure you want to ${action} this user?`)) return;

    try {
      setTogglingId(userId);
      setError('');
      setSuccessMsg('');
      const token = localStorage.getItem('userToken');

      const res = await fetch(
        `http://localhost:5001/api/admin/users/${userId}/toggle-status`,
        {
          method: 'PUT',
          headers: {
            Authorization: token ? `Bearer ${token}` : '',
            'Content-Type': 'application/json',
          },
          credentials: 'include',
          body: JSON.stringify({ is_active: !currentStatus }),
        }
      );

      const data = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(data.error || 'Failed to update user');

      setSuccessMsg(data.message || `User ${action}d successfully`);
      setTimeout(() => setSuccessMsg(''), 3000);

      // Refresh the list
      await loadUsers(roleFilter, searchQuery);
    } catch (err) {
      setError(err.message);
    } finally {
      setTogglingId(null);
    }
  };

  /* ───── Helpers ───── */
  const formatDate = (dateStr) => {
    if (!dateStr) return '—';
    try {
      const d = new Date(dateStr);
      return d.toLocaleDateString('en-US', { year: 'numeric', month: 'short', day: 'numeric' });
    } catch {
      return dateStr;
    }
  };

  const roleBadge = (role) => {
    const c = ROLE_BADGE_COLORS[role] || ROLE_BADGE_COLORS.user;
    return (
      <span className="role-badge" style={{ background: c.bg, color: c.color }}>
        {role}
      </span>
    );
  };

  /* ───── Render ───── */
  return (
    <div className="admin-users-page">
      <Navbar />

      <section className="admin-users-content">
        <div className="container">
          {/* Header */}
          <div className="admin-users-header">
            <div>
              <Link to="/admin-dashboard" className="back-link">
                <i className="fas fa-arrow-left"></i> Admin Dashboard
              </Link>
              <h2><i className="fas fa-users-cog"></i> User Management</h2>
              <p>View, search, filter and activate / deactivate user accounts.</p>
            </div>
          </div>

          {/* Alerts */}
          {error && (
            <div className="alert alert-error">
              <i className="fas fa-exclamation-circle"></i> {error}
            </div>
          )}
          {successMsg && (
            <div className="alert alert-success">
              <i className="fas fa-check-circle"></i> {successMsg}
            </div>
          )}

          {/* Stats Cards */}
          <div className="users-stats-grid">
            <div className="stat-card">
              <div className="stat-label">Total Users</div>
              <div className="stat-value">{stats.total}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Active</div>
              <div className="stat-value">{stats.active}</div>
            </div>
            <div className="stat-card">
              <div className="stat-label">Inactive</div>
              <div className="stat-value">{stats.inactive}</div>
            </div>
            {Object.entries(stats.roleCounts).map(([role, count]) => (
              <div className="stat-card" key={role}>
                <div className="stat-label">{role.charAt(0).toUpperCase() + role.slice(1)}s</div>
                <div className="stat-value">{count}</div>
              </div>
            ))}
          </div>

          {/* Filters */}
          <div className="filters-bar">
            <div className="role-filter-group">
              {ROLE_OPTIONS.map((opt) => (
                <button
                  key={opt.value}
                  className={`role-filter-btn ${roleFilter === opt.value ? 'active' : ''}`}
                  onClick={() => setRoleFilter(opt.value)}
                >
                  <i className={opt.icon}></i> {opt.label}
                </button>
              ))}
            </div>

            <div className="search-box">
              <i className="fas fa-search search-icon"></i>
              <input
                type="text"
                placeholder="Search by name, email, or farm…"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
              />
              {searchQuery && (
                <button className="clear-search" onClick={() => setSearchQuery('')}>
                  <i className="fas fa-times"></i>
                </button>
              )}
            </div>
          </div>

          {/* User Table */}
          <div className="users-table-wrapper">
            {isLoading ? (
              <div className="loading-state">
                <i className="fas fa-spinner fa-spin"></i> Loading users…
              </div>
            ) : users.length === 0 ? (
              <div className="empty-state">
                <i className="fas fa-inbox"></i>
                <p>No users found{roleFilter !== 'all' ? ` with role "${roleFilter}"` : ''}{searchQuery ? ` matching "${searchQuery}"` : ''}.</p>
              </div>
            ) : (
              <table className="users-table">
                <thead>
                  <tr>
                    <th>User</th>
                    <th>Email</th>
                    <th>Role</th>
                    <th>Status</th>
                    <th>Joined</th>
                    <th>Last Login</th>
                    <th style={{ textAlign: 'center' }}>Action</th>
                  </tr>
                </thead>
                <tbody>
                  {users.map((u) => (
                    <tr key={u.id} className={u.is_active ? '' : 'row-inactive'}>
                      <td>
                        <div className="user-cell">
                          <div className="avatar">
                            {u.profile_picture ? (
                              <img src={u.profile_picture} alt="" />
                            ) : (
                              <span>{(u.first_name?.[0] || '').toUpperCase()}{(u.last_name?.[0] || '').toUpperCase()}</span>
                            )}
                          </div>
                          <div>
                            <div className="user-name">{u.first_name} {u.last_name}</div>
                            {u.farm_name && <div className="user-farm"><i className="fas fa-seedling"></i> {u.farm_name}</div>}
                          </div>
                        </div>
                      </td>
                      <td className="email-cell">{u.email}</td>
                      <td>{roleBadge(u.role)}</td>
                      <td>
                        <span className={`status-pill ${u.is_active ? 'active' : 'inactive'}`}>
                          {u.is_active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td className="date-cell">{formatDate(u.created_at)}</td>
                      <td className="date-cell">{formatDate(u.last_login)}</td>
                      <td style={{ textAlign: 'center' }}>
                        <button
                          className={`toggle-btn ${u.is_active ? 'deactivate' : 'activate'}`}
                          disabled={togglingId === u.id}
                          onClick={() => handleToggleStatus(u.id, u.is_active)}
                          title={u.is_active ? 'Deactivate user' : 'Activate user'}
                        >
                          {togglingId === u.id ? (
                            <i className="fas fa-spinner fa-spin"></i>
                          ) : u.is_active ? (
                            <><i className="fas fa-ban"></i> Deactivate</>
                          ) : (
                            <><i className="fas fa-check-circle"></i> Activate</>
                          )}
                        </button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>

          <div className="result-count">
            Showing <strong>{users.length}</strong> user{users.length !== 1 ? 's' : ''}
          </div>
        </div>
      </section>

      {/* ────── Styles ────── */}
      <style>{`
        .admin-users-page {
          min-height: 100vh;
          background: radial-gradient(circle at top left, #e8f5e9 0%, #f4f6f9 45%, #fefcfb 100%);
          font-family: "Space Grotesk", "Segoe UI", sans-serif;
        }
        .admin-users-content {
          padding: 32px 20px 60px;
          max-width: 1280px;
          margin: 0 auto;
        }

        /* ── Header ── */
        .admin-users-header {
          margin-bottom: 24px;
        }
        .back-link {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          color: #2c7a2c;
          font-size: 0.85rem;
          font-weight: 600;
          text-decoration: none;
          margin-bottom: 8px;
        }
        .back-link:hover { text-decoration: underline; }
        .admin-users-header h2 {
          margin: 0 0 6px;
          font-size: 1.8rem;
          color: #0f172a;
          display: flex;
          align-items: center;
          gap: 10px;
        }
        .admin-users-header p {
          color: #475569;
          margin: 0;
        }

        /* ── Alerts ── */
        .alert {
          padding: 12px 16px;
          border-radius: 12px;
          margin-bottom: 16px;
          font-size: 0.9rem;
          display: flex;
          align-items: center;
          gap: 8px;
        }
        .alert-error {
          background: #fee2e2;
          color: #b91c1c;
          border: 1px solid #fecaca;
        }
        .alert-success {
          background: #dcfce7;
          color: #15803d;
          border: 1px solid #bbf7d0;
        }

        /* ── Stats Grid ── */
        .users-stats-grid {
          display: grid;
          grid-template-columns: repeat(auto-fit, minmax(160px, 1fr));
          gap: 12px;
          margin-bottom: 22px;
        }
        .stat-card {
          background: #fff;
          border-radius: 14px;
          padding: 20px 24px;
          border: 1px solid rgba(15, 23, 42, 0.08);
          box-shadow: 0 8px 22px rgba(15, 23, 42, 0.06);
          display: flex;
          flex-direction: column;
          align-items: flex-start;
          gap: 8px;
        }
        .stat-label {
          font-size: 0.85rem;
          font-weight: 600;
          color: #64748b;
          text-transform: uppercase;
          letter-spacing: 0.05em;
          margin: 0;
        }
        .stat-value {
          font-size: 2rem;
          font-weight: 800;
          color: #1a1a1a;
          line-height: 1;
        }

        /* ── Filters ── */
        .filters-bar {
          display: flex;
          flex-wrap: wrap;
          align-items: center;
          gap: 14px;
          margin-bottom: 18px;
        }
        .role-filter-group {
          display: flex;
          flex-wrap: wrap;
          gap: 6px;
        }
        .role-filter-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 8px 14px;
          border-radius: 999px;
          border: 1px solid #d1d5db;
          background: #fff;
          color: #374151;
          font-size: 0.82rem;
          font-weight: 600;
          cursor: pointer;
          transition: all 0.15s;
        }
        .role-filter-btn:hover {
          border-color: #2c7a2c;
          color: #2c7a2c;
        }
        .role-filter-btn.active {
          background: #2c7a2c;
          color: #fff;
          border-color: #2c7a2c;
        }

        /* ── Search ── */
        .search-box {
          position: relative;
          flex: 1;
          min-width: 220px;
          max-width: 360px;
        }
        .search-icon {
          position: absolute;
          left: 14px;
          top: 50%;
          transform: translateY(-50%);
          color: #94a3b8;
          font-size: 0.85rem;
        }
        .search-box input {
          width: 100%;
          padding: 10px 36px 10px 38px;
          border-radius: 12px;
          border: 1px solid #d1d5db;
          font-size: 0.88rem;
          background: #fff;
          box-sizing: border-box;
        }
        .search-box input:focus {
          outline: none;
          border-color: #2c7a2c;
          box-shadow: 0 0 0 3px rgba(44, 122, 44, 0.12);
        }
        .clear-search {
          position: absolute;
          right: 10px;
          top: 50%;
          transform: translateY(-50%);
          background: none;
          border: none;
          color: #94a3b8;
          cursor: pointer;
          font-size: 0.8rem;
        }

        /* ── Table ── */
        .users-table-wrapper {
          background: #fff;
          border-radius: 16px;
          box-shadow: 0 10px 26px rgba(15, 23, 42, 0.08);
          border: 1px solid rgba(15, 23, 42, 0.08);
          overflow-x: auto;
        }
        .users-table {
          width: 100%;
          border-collapse: collapse;
          font-size: 0.88rem;
        }
        .users-table th {
          text-align: left;
          padding: 14px 16px;
          background: #f8fafc;
          color: #475569;
          font-weight: 700;
          font-size: 0.78rem;
          text-transform: uppercase;
          letter-spacing: 0.5px;
          border-bottom: 2px solid #e5e7eb;
          white-space: nowrap;
        }
        .users-table td {
          padding: 14px 16px;
          border-bottom: 1px solid #f1f5f9;
          vertical-align: middle;
        }
        .users-table tbody tr { transition: background 0.15s; }
        .users-table tbody tr:hover { background: #f0fdf4; }
        .users-table tbody tr.row-inactive { background: #fafafa; }
        .users-table tbody tr.row-inactive:hover { background: #f5f5f5; }

        /* user cell */
        .user-cell {
          display: flex;
          align-items: center;
          gap: 12px;
        }
        .avatar {
          width: 38px;
          height: 38px;
          border-radius: 50%;
          background: linear-gradient(135deg, #2c7a2c, #4caf50);
          color: #fff;
          display: flex;
          align-items: center;
          justify-content: center;
          font-weight: 700;
          font-size: 0.8rem;
          overflow: hidden;
          flex-shrink: 0;
        }
        .avatar img {
          width: 100%;
          height: 100%;
          object-fit: cover;
        }
        .user-name { font-weight: 600; color: #0f172a; white-space: nowrap; }
        .user-farm { font-size: 0.75rem; color: #64748b; margin-top: 2px; }
        .email-cell { color: #475569; }
        .date-cell  { color: #64748b; font-size: 0.82rem; white-space: nowrap; }

        /* badges & pills */
        .role-badge {
          display: inline-block;
          padding: 3px 10px;
          border-radius: 999px;
          font-size: 0.72rem;
          font-weight: 700;
          text-transform: capitalize;
        }
        .status-pill {
          display: inline-block;
          padding: 3px 10px;
          border-radius: 999px;
          font-size: 0.72rem;
          font-weight: 700;
        }
        .status-pill.active  { background: #dcfce7; color: #15803d; }
        .status-pill.inactive { background: #fee2e2; color: #b91c1c; }

        /* toggle button */
        .toggle-btn {
          display: inline-flex;
          align-items: center;
          gap: 6px;
          padding: 7px 14px;
          border-radius: 10px;
          font-size: 0.78rem;
          font-weight: 600;
          cursor: pointer;
          border: none;
          transition: all 0.15s;
          white-space: nowrap;
        }
        .toggle-btn.activate {
          background: #dcfce7;
          color: #15803d;
        }
        .toggle-btn.activate:hover { background: #bbf7d0; }
        .toggle-btn.deactivate {
          background: #fee2e2;
          color: #b91c1c;
        }
        .toggle-btn.deactivate:hover { background: #fecaca; }
        .toggle-btn:disabled { opacity: 0.6; cursor: not-allowed; }

        /* empty / loading */
        .loading-state, .empty-state {
          padding: 48px 16px;
          text-align: center;
          color: #64748b;
          font-size: 0.95rem;
        }
        .empty-state i { font-size: 2rem; display: block; margin-bottom: 12px; color: #cbd5e1; }

        .result-count {
          margin-top: 12px;
          text-align: right;
          color: #64748b;
          font-size: 0.82rem;
        }

        /* ── Responsive ── */
        @media (max-width: 768px) {
          .filters-bar { flex-direction: column; align-items: stretch; }
          .search-box { max-width: none; }
          .role-filter-group { overflow-x: auto; flex-wrap: nowrap; padding-bottom: 4px; }
          .users-table th, .users-table td { padding: 10px 10px; font-size: 0.8rem; }
          .user-cell { gap: 8px; }
          .avatar { width: 32px; height: 32px; font-size: 0.7rem; }
          .admin-users-header h2 { font-size: 1.4rem; }
        }
      `}</style>
    </div>
  );
};

export default AdminUsers;
