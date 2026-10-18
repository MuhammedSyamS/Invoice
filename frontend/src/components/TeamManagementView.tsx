import React, { useState, useEffect } from 'react';
import type { TeamMember, AuditLogEntry, AuthUser } from '../types/invoice';
import {
  ShieldCheck,
  Plus,
  Mail,
  Trash2,
  X,
  History,
  CheckCircle2,
  XCircle,
  Clock,
  UserCheck,
  Crown,
  AlertCircle,
  RefreshCw,
} from 'lucide-react';
import { CI } from './ClearableInput';
import { apiService } from '../services/apiService';
import {
  getStoredRegisteredUsers,
  saveStoredRegisteredUsers,
  recordAuditLog,
} from '../services/storageService';

interface TeamManagementViewProps {
  team: TeamMember[];
  auditLogs: AuditLogEntry[];
  currentUser?: AuthUser | null;
  onAddMember: (member: TeamMember) => void;
  onDeleteMember: (memberId: string) => void;
  onRefreshTeam?: () => void;
}

export const TeamManagementView: React.FC<TeamManagementViewProps> = ({
  team,
  auditLogs,
  currentUser,
  onAddMember,
  onDeleteMember,
  onRefreshTeam,
}) => {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<TeamMember['role']>('Accountant');
  const [activeTab, setActiveTab] = useState<'members' | 'pending' | 'audit'>('members');
  const [dbUsers, setDbUsers] = useState<any[]>([]);
  const [isLoadingUsers, setIsLoadingUsers] = useState(false);
  const [actionMsg, setActionMsg] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const isOwner = currentUser?.role === 'Owner' || currentUser?.email === 'admin@highphaus.com';

  // Load MongoDB users
  const loadDbUsers = async () => {
    setIsLoadingUsers(true);
    try {
      const res = await apiService.getUsers();
      if (res && res.success && Array.isArray(res.data)) {
        setDbUsers(res.data);
      }
    } catch {
      // Local fallback handled below
    } finally {
      setIsLoadingUsers(false);
    }
  };

  useEffect(() => {
    loadDbUsers();
  }, []);

  // Merge team members with DB users and local registered accounts for comprehensive view
  const localAccounts = getStoredRegisteredUsers();

  // Combine unique users
  const userMap = new Map<string, any>();

  // 1. First add local team members
  team.forEach((m) => {
    userMap.set(m.email.toLowerCase(), {
      id: m.id,
      name: m.name,
      email: m.email,
      role: m.role,
      status: m.status || 'approved',
      joinedDate: m.joinedDate,
      approvedBy: m.approvedBy,
      approvedAt: m.approvedAt,
    });
  });

  // 2. Overlay local registered accounts
  localAccounts.forEach((acc) => {
    const key = acc.email.toLowerCase();
    const existing = userMap.get(key);
    userMap.set(key, {
      id: acc.id,
      name: acc.name,
      email: acc.email,
      role: acc.role,
      status: acc.status || (existing ? existing.status : 'approved'),
      joinedDate: existing ? existing.joinedDate : '2026-01-01',
      approvedBy: acc.approvedBy || (existing ? existing.approvedBy : null),
      approvedAt: acc.approvedAt || (existing ? existing.approvedAt : null),
    });
  });

  // 3. Overlay MongoDB cloud users
  dbUsers.forEach((u) => {
    const key = u.email.toLowerCase();
    userMap.set(key, {
      id: u.id || u._id,
      name: u.name,
      email: u.email,
      role: u.role,
      status: u.status || 'approved',
      joinedDate: u.createdAt ? new Date(u.createdAt).toISOString().slice(0, 10) : '2026-01-01',
      approvedBy: u.approvedBy,
      approvedAt: u.approvedAt ? new Date(u.approvedAt).toLocaleDateString('en-IN') : null,
      rejectedReason: u.rejectedReason,
    });
  });

  const allUsers = Array.from(userMap.values());
  const pendingUsers = allUsers.filter((u) => u.status === 'pending');

  const handleApprove = async (user: any) => {
    setActionMsg(null);
    try {
      // 1. Backend MongoDB approval
      await apiService.approveUser(user.id, currentUser?.name || 'Workspace Owner');

      // 2. Update local storage registered accounts
      const regUsers = getStoredRegisteredUsers();
      const updatedReg = regUsers.map((r) =>
        r.email.toLowerCase() === user.email.toLowerCase()
          ? { ...r, status: 'approved' as const, approvedBy: currentUser?.name || 'Workspace Owner' }
          : r
      );
      saveStoredRegisteredUsers(updatedReg);

      // 3. Add to / update team roster
      onAddMember({
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        status: 'approved',
        joinedDate: user.joinedDate || new Date().toISOString().slice(0, 10),
        approvedBy: currentUser?.name || 'Workspace Owner',
        approvedAt: new Date().toISOString(),
      });

      recordAuditLog({
        userName: currentUser?.name || 'Workspace Owner',
        action: 'User Approved by Owner',
        entityType: 'Settings',
        entityId: user.id,
        details: `Workspace Owner approved access for user: ${user.name} (${user.email}) as ${user.role}.`,
      });

      setActionMsg({
        type: 'success',
        text: `✅ Access Approved! ${user.name} (${user.email}) can now sign into the workspace.`,
      });

      loadDbUsers();
      if (onRefreshTeam) onRefreshTeam();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err?.message || 'Failed to approve user.' });
    }
  };

  const handleReject = async (user: any) => {
    setActionMsg(null);
    try {
      // 1. Backend MongoDB rejection
      await apiService.rejectUser(user.id, currentUser?.name || 'Workspace Owner', 'Denied by Workspace Owner.');

      // 2. Update local storage registered accounts
      const regUsers = getStoredRegisteredUsers();
      const updatedReg = regUsers.map((r) =>
        r.email.toLowerCase() === user.email.toLowerCase()
          ? { ...r, status: 'rejected' as const, approvedBy: currentUser?.name || 'Workspace Owner' }
          : r
      );
      saveStoredRegisteredUsers(updatedReg);

      recordAuditLog({
        userName: currentUser?.name || 'Workspace Owner',
        action: 'User Rejected by Owner',
        entityType: 'Settings',
        entityId: user.id,
        details: `Workspace Owner rejected access request for: ${user.name} (${user.email}).`,
      });

      setActionMsg({
        type: 'success',
        text: `User request for ${user.name} (${user.email}) has been rejected.`,
      });

      loadDbUsers();
      if (onRefreshTeam) onRefreshTeam();
    } catch (err: any) {
      setActionMsg({ type: 'error', text: err?.message || 'Failed to reject user.' });
    }
  };

  const handleInvite = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    try {
      // 1. Create account in MongoDB User collection
      const regRes = await apiService.registerUser({
        name: cleanName,
        email: cleanEmail,
        password: 'password123',
        role,
      });

      if (regRes && regRes.success && regRes.user) {
        // 2. Automatically approve invited user
        await apiService.approveUser(regRes.user.id, currentUser?.name || 'Workspace Owner');
      }
    } catch {
      // Continue to local sync
    }

    const newMember: TeamMember = {
      id: `team-${Date.now()}`,
      name: cleanName,
      email: cleanEmail,
      role,
      status: 'approved',
      joinedDate: new Date().toISOString().slice(0, 10),
      approvedBy: currentUser?.name || 'Workspace Owner',
      approvedAt: new Date().toISOString(),
    };

    onAddMember(newMember);
    setShowInviteModal(false);
    setName('');
    setEmail('');
    loadDbUsers();
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <h1 className="page-title" style={{ margin: 0 }}>Team Roles & User Approvals</h1>
            {isOwner && (
              <span
                style={{
                  display: 'inline-flex',
                  alignItems: 'center',
                  gap: '0.25rem',
                  padding: '0.2rem 0.55rem',
                  borderRadius: '12px',
                  background: 'rgba(245, 158, 11, 0.15)',
                  border: '1px solid rgba(245, 158, 11, 0.35)',
                  color: '#f59e0b',
                  fontSize: '0.72rem',
                  fontWeight: 700,
                }}
              >
                <Crown size={12} />
                <span>Workspace Owner</span>
              </span>
            )}
          </div>
          <p className="page-subtitle" style={{ marginTop: '0.35rem' }}>
            Manage registered platform users, review and approve new login requests, and inspect immutable audit logs.
          </p>
        </div>

        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center' }}>
          <button
            onClick={loadDbUsers}
            disabled={isLoadingUsers}
            className="btn btn-secondary btn-sm"
            title="Refresh database user roster"
          >
            <RefreshCw size={14} className={isLoadingUsers ? 'spin' : ''} />
            <span>Sync Users</span>
          </button>

          {isOwner && (
            <button onClick={() => setShowInviteModal(true)} className="btn btn-primary">
              <Plus size={16} />
              <span>Invite Team Member</span>
            </button>
          )}
        </div>
      </div>

      {/* Action Notification Alert */}
      {actionMsg && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            gap: '0.75rem',
            padding: '0.75rem 1rem',
            borderRadius: '8px',
            background: actionMsg.type === 'success' ? 'rgba(16, 185, 129, 0.12)' : 'rgba(239, 68, 68, 0.12)',
            border: `1px solid ${actionMsg.type === 'success' ? 'var(--success)' : 'var(--danger)'}`,
            color: actionMsg.type === 'success' ? 'var(--success)' : 'var(--danger)',
            fontSize: '0.85rem',
            fontWeight: 600,
          }}
        >
          <span>{actionMsg.text}</span>
          <button
            onClick={() => setActionMsg(null)}
            style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'inherit', padding: 0 }}
          >
            <X size={15} />
          </button>
        </div>
      )}

      {/* Owner Pending Notice */}
      {isOwner && pendingUsers.length > 0 && (
        <div
          style={{
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
            flexWrap: 'wrap',
            gap: '0.75rem',
            padding: '0.85rem 1.15rem',
            borderRadius: '10px',
            background: 'linear-gradient(135deg, rgba(245, 158, 11, 0.12) 0%, rgba(234, 88, 12, 0.12) 100%)',
            border: '1px solid rgba(245, 158, 11, 0.4)',
          }}
        >
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
            <Clock size={18} color="#f59e0b" />
            <div>
              <div style={{ fontWeight: 800, color: 'var(--text-primary)', fontSize: '0.9rem' }}>
                {pendingUsers.length} User Registration{pendingUsers.length > 1 ? 's' : ''} Awaiting Your Approval
              </div>
              <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                New accounts cannot sign into the SaaS until you approve them below.
              </div>
            </div>
          </div>
          <button
            onClick={() => setActiveTab('pending')}
            className="btn btn-primary btn-sm"
            style={{ background: '#f59e0b', borderColor: '#f59e0b', color: '#000000', fontWeight: 700 }}
          >
            Review Approvals ({pendingUsers.length})
          </button>
        </div>
      )}

      {/* Tabs */}
      <div className="card" style={{ padding: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem', flexWrap: 'wrap' }}>
          <button
            onClick={() => setActiveTab('members')}
            className={`btn btn-sm ${activeTab === 'members' ? 'btn-primary' : 'btn-outline'}`}
            style={{ border: 'none' }}
          >
            <ShieldCheck size={14} />
            <span>Platform Users ({allUsers.length})</span>
          </button>

          <button
            onClick={() => setActiveTab('pending')}
            className={`btn btn-sm ${activeTab === 'pending' ? 'btn-primary' : 'btn-outline'}`}
            style={{ border: 'none', position: 'relative' }}
          >
            <Clock size={14} />
            <span>Pending Approvals</span>
            {pendingUsers.length > 0 && (
              <span
                style={{
                  marginLeft: '0.35rem',
                  padding: '0.1rem 0.45rem',
                  borderRadius: '10px',
                  background: '#ef4444',
                  color: '#ffffff',
                  fontSize: '0.7rem',
                  fontWeight: 800,
                }}
              >
                {pendingUsers.length}
              </span>
            )}
          </button>

          <button
            onClick={() => setActiveTab('audit')}
            className={`btn btn-sm ${activeTab === 'audit' ? 'btn-primary' : 'btn-outline'}`}
            style={{ border: 'none' }}
          >
            <History size={14} />
            <span>Security Audit Log ({auditLogs.length})</span>
          </button>
        </div>
      </div>

      {/* Tab 1: All Platform Users */}
      {activeTab === 'members' && (
        <>
          <div className="table-container responsive-desktop-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th>User / Owner</th>
                  <th>Email Address</th>
                  <th>Role</th>
                  <th>Approval Status</th>
                  <th>Registered</th>
                  <th>Approved By</th>
                  <th style={{ textAlign: 'right' }}>Owner Actions</th>
                </tr>
              </thead>
              <tbody>
                {allUsers.map((user) => (
                  <tr key={user.id || user.email}>
                    <td>
                      <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <span style={{ fontWeight: 700 }}>{user.name}</span>
                        {user.role === 'Owner' && (
                          <span
                            title="Workspace Owner"
                            style={{
                              display: 'inline-flex',
                              alignItems: 'center',
                              gap: '0.2rem',
                              padding: '0.15rem 0.4rem',
                              borderRadius: '4px',
                              background: 'rgba(245, 158, 11, 0.15)',
                              color: '#f59e0b',
                              fontSize: '0.65rem',
                              fontWeight: 800,
                            }}
                          >
                            <Crown size={10} /> OWNER
                          </span>
                        )}
                      </div>
                    </td>
                    <td style={{ color: 'var(--text-secondary)' }}>{user.email}</td>
                    <td>
                      <span className="badge badge-draft">{user.role}</span>
                    </td>
                    <td>
                      {user.status === 'pending' && (
                        <span
                          className="badge"
                          style={{
                            background: 'rgba(245, 158, 11, 0.15)',
                            color: '#f59e0b',
                            border: '1px solid rgba(245, 158, 11, 0.35)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                          }}
                        >
                          <Clock size={11} /> Pending Approval
                        </span>
                      )}
                      {(user.status === 'approved' || user.status === 'active') && (
                        <span
                          className="badge"
                          style={{
                            background: 'rgba(16, 185, 129, 0.15)',
                            color: 'var(--success)',
                            border: '1px solid rgba(16, 185, 129, 0.35)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                          }}
                        >
                          <CheckCircle2 size={11} /> Approved
                        </span>
                      )}
                      {user.status === 'rejected' && (
                        <span
                          className="badge"
                          style={{
                            background: 'rgba(239, 68, 68, 0.15)',
                            color: 'var(--danger)',
                            border: '1px solid rgba(239, 68, 68, 0.35)',
                            display: 'inline-flex',
                            alignItems: 'center',
                            gap: '0.3rem',
                          }}
                        >
                          <XCircle size={11} /> Rejected
                        </span>
                      )}
                    </td>
                    <td style={{ fontSize: '0.825rem' }}>{user.joinedDate}</td>
                    <td style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {user.approvedBy || (user.role === 'Owner' ? 'Self (Owner)' : 'Pending')}
                    </td>
                    <td style={{ textAlign: 'right' }}>
                      <div style={{ display: 'inline-flex', gap: '0.35rem', alignItems: 'center' }}>
                        {user.status === 'pending' && isOwner && (
                          <>
                            <button
                              onClick={() => handleApprove(user)}
                              className="btn btn-sm"
                              style={{
                                background: 'rgba(16, 185, 129, 0.15)',
                                color: 'var(--success)',
                                border: '1px solid rgba(16, 185, 129, 0.35)',
                                padding: '0.25rem 0.5rem',
                                fontSize: '0.75rem',
                              }}
                              title="Approve User Access"
                            >
                              <CheckCircle2 size={13} />
                              <span>Approve</span>
                            </button>
                            <button
                              onClick={() => handleReject(user)}
                              className="btn btn-sm"
                              style={{
                                background: 'rgba(239, 68, 68, 0.15)',
                                color: 'var(--danger)',
                                border: '1px solid rgba(239, 68, 68, 0.35)',
                                padding: '0.25rem 0.5rem',
                                fontSize: '0.75rem',
                              }}
                              title="Reject User Access"
                            >
                              <XCircle size={13} />
                              <span>Reject</span>
                            </button>
                          </>
                        )}

                        {user.role !== 'Owner' && isOwner && (
                          <button
                            onClick={() => onDeleteMember(user.id)}
                            className="btn btn-danger btn-sm"
                            title="Remove User"
                            style={{ padding: '0.25rem 0.45rem' }}
                          >
                            <Trash2 size={13} />
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="responsive-mobile-cards">
            {allUsers.map((user) => (
              <div key={`m-team-${user.id || user.email}`} className="mobile-data-card">
                <div className="mobile-data-card-header">
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                      {user.name}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {user.email}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <span className="badge badge-draft">{user.role}</span>
                    <span className="badge badge-active">{user.status}</span>
                  </div>
                </div>

                <div className="mobile-data-card-meta">
                  <div className="mobile-data-card-meta-row">
                    <span className="mobile-data-card-meta-label">Joined</span>
                    <span className="mobile-data-card-meta-value">{user.joinedDate}</span>
                  </div>
                  {user.approvedBy && (
                    <div className="mobile-data-card-meta-row">
                      <span className="mobile-data-card-meta-label">Approved By</span>
                      <span className="mobile-data-card-meta-value">{user.approvedBy}</span>
                    </div>
                  )}
                </div>

                {user.status === 'pending' && isOwner && (
                  <div className="mobile-data-card-actions" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <button
                      onClick={() => handleApprove(user)}
                      className="btn btn-sm"
                      style={{ background: 'var(--success)', color: '#ffffff', justifyContent: 'center' }}
                    >
                      <CheckCircle2 size={14} />
                      <span>Approve</span>
                    </button>
                    <button
                      onClick={() => handleReject(user)}
                      className="btn btn-danger btn-sm"
                      style={{ justifyContent: 'center' }}
                    >
                      <XCircle size={14} />
                      <span>Reject</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Tab 2: Pending Approvals Only */}
      {activeTab === 'pending' && (
        <div>
          {!isOwner && (
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: '0.75rem',
                padding: '1rem',
                borderRadius: '8px',
                background: 'rgba(239, 68, 68, 0.1)',
                border: '1px solid var(--danger)',
                color: 'var(--danger)',
                fontSize: '0.85rem',
                marginBottom: '1rem',
              }}
            >
              <AlertCircle size={18} />
              <span>Only the Workspace Owner has permissions to approve or reject pending account access.</span>
            </div>
          )}

          {pendingUsers.length === 0 ? (
            <div className="empty-state" style={{ padding: '3rem 1rem' }}>
              <UserCheck size={40} color="var(--success)" style={{ opacity: 0.8, marginBottom: '0.5rem' }} />
              <div style={{ fontWeight: 800, fontSize: '1.1rem', color: 'var(--text-primary)' }}>
                No Pending Access Requests
              </div>
              <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', maxWidth: '420px', margin: '0.35rem auto 0' }}>
                All user accounts registered in MongoDB are currently approved or processed. New user signups will appear here for Owner review.
              </p>
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem' }}>
              {pendingUsers.map((user) => (
                <div
                  key={`pending-${user.id || user.email}`}
                  className="card"
                  style={{
                    padding: '1.25rem 1.5rem',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    flexWrap: 'wrap',
                    gap: '1rem',
                    borderLeft: '4px solid #f59e0b',
                  }}
                >
                  <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.65rem' }}>
                      <span style={{ fontWeight: 800, fontSize: '1.05rem', color: 'var(--text-primary)' }}>
                        {user.name}
                      </span>
                      <span className="badge badge-draft">{user.role}</span>
                      <span
                        className="badge"
                        style={{
                          background: 'rgba(245, 158, 11, 0.15)',
                          color: '#f59e0b',
                          border: '1px solid rgba(245, 158, 11, 0.35)',
                        }}
                      >
                        Pending Owner Approval
                      </span>
                    </div>

                    <div style={{ marginTop: '0.35rem', fontSize: '0.85rem', color: 'var(--text-secondary)', display: 'flex', gap: '1.5rem', flexWrap: 'wrap' }}>
                      <span>Email: <strong style={{ color: 'var(--text-primary)' }}>{user.email}</strong></span>
                      <span>Requested: <strong style={{ color: 'var(--text-primary)' }}>{user.joinedDate}</strong></span>
                    </div>
                  </div>

                  {isOwner ? (
                    <div style={{ display: 'flex', gap: '0.65rem' }}>
                      <button
                        onClick={() => handleApprove(user)}
                        className="btn btn-primary"
                        style={{ background: 'var(--success)', borderColor: 'var(--success)' }}
                      >
                        <CheckCircle2 size={16} />
                        <span>Approve Access</span>
                      </button>

                      <button
                        onClick={() => handleReject(user)}
                        className="btn btn-danger"
                      >
                        <XCircle size={16} />
                        <span>Reject Request</span>
                      </button>
                    </div>
                  ) : (
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                      Awaiting Owner decision
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* Tab 3: Security Audit Log */}
      {activeTab === 'audit' && (
        <>
          <div className="table-container responsive-desktop-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>Actor / User</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Details</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      No audit events recorded yet. System activities and user approvals will appear here.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td style={{ fontSize: '0.8rem', whiteSpace: 'nowrap' }}>{log.timestamp}</td>
                      <td style={{ fontWeight: 700 }}>{log.userName}</td>
                      <td>
                        <span className="badge badge-draft">{log.action}</span>
                      </td>
                      <td>{log.entityType}</td>
                      <td style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{log.details}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="responsive-mobile-cards">
            {auditLogs.length === 0 ? (
              <div style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                No audit events recorded yet.
              </div>
            ) : (
              auditLogs.map((log) => (
                <div key={`m-audit-${log.id}`} className="mobile-data-card">
                  <div className="mobile-data-card-header">
                    <div>
                      <div style={{ fontWeight: 800, fontSize: '0.9rem', color: 'var(--text-primary)' }}>
                        {log.action}
                      </div>
                      <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        by {log.userName}
                      </div>
                    </div>
                    <span className="badge badge-draft">{log.timestamp}</span>
                  </div>

                  <div className="mobile-data-card-meta">
                    <div className="mobile-data-card-meta-row">
                      <span className="mobile-data-card-meta-label">Entity</span>
                      <span className="mobile-data-card-meta-value">{log.entityType}</span>
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-primary)', marginTop: '0.25rem' }}>
                      {log.details}
                    </div>
                  </div>
                </div>
              ))
            )}
          </div>
        </>
      )}

      {/* Invite Modal */}
      {showInviteModal && (
        <div className="modal-overlay">
          <div className="modal-content" style={{ maxWidth: '440px', padding: '1.5rem' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem' }}>
              <h3 style={{ fontSize: '1.1rem', fontWeight: 800, color: 'var(--text-primary)', margin: 0 }}>
                Invite & Pre-Approve Team Member
              </h3>
              <button onClick={() => setShowInviteModal(false)} className="btn btn-secondary btn-sm" style={{ padding: '0.35rem' }}>
                <X size={16} />
              </button>
            </div>

            <form onSubmit={handleInvite} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
              <div className="form-group">
                <label className="form-label">Full Name</label>
                <CI type="text" value={name} onChange={(e) => setName(e.target.value)} onClear={() => setName('')} className="form-input" placeholder="e.g. Rahul Sharma" required />
              </div>

              <div className="form-group">
                <label className="form-label">Email Address</label>
                <CI type="email" value={email} onChange={(e) => setEmail(e.target.value)} onClear={() => setEmail('')} className="form-input" placeholder="name@company.com" required />
              </div>

              <div className="form-group">
                <label className="form-label">Role</label>
                <select
                  value={role}
                  onChange={(e) => setRole(e.target.value as TeamMember['role'])}
                  className="form-select"
                >
                  <option value="Admin">Administrator (Billing & Team Management)</option>
                  <option value="Accountant">Accountant (Invoices, Bills & Tax Reports)</option>
                  <option value="Viewer">Viewer (Read-only access)</option>
                </select>
              </div>

              <div style={{ display: 'flex', justifyContent: 'flex-end', gap: '0.75rem', marginTop: '0.5rem', borderTop: '1px solid var(--border-color)', paddingTop: '0.75rem' }}>
                <button type="button" onClick={() => setShowInviteModal(false)} className="btn btn-secondary">
                  Cancel
                </button>
                <button type="submit" className="btn btn-primary">
                  <Mail size={14} />
                  <span>Send Invitation</span>
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};
