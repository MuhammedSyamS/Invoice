import React, { useState } from 'react';
import type { TeamMember, AuditLogEntry } from '../types/invoice';
import {
  ShieldCheck,
  Plus,
  Mail,
  Trash2,
  X,
  History,
} from 'lucide-react';
import { CI } from './ClearableInput';

interface TeamManagementViewProps {
  team: TeamMember[];
  auditLogs: AuditLogEntry[];
  onAddMember: (member: TeamMember) => void;
  onDeleteMember: (memberId: string) => void;
}

export const TeamManagementView: React.FC<TeamManagementViewProps> = ({
  team,
  auditLogs,
  onAddMember,
  onDeleteMember,
}) => {
  const [showInviteModal, setShowInviteModal] = useState(false);
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [role, setRole] = useState<TeamMember['role']>('Accountant');
  const [activeTab, setActiveTab] = useState<'members' | 'audit'>('members');

  const handleInvite = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim() || !email.trim()) return;

    const newMember: TeamMember = {
      id: `team-${Date.now()}`,
      name: name.trim(),
      email: email.trim(),
      role,
      status: 'active',
      joinedDate: new Date().toISOString().slice(0, 10),
    };

    onAddMember(newMember);
    setShowInviteModal(false);
    setName('');
    setEmail('');
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="page-title">Team Roles & System Audit Trail</h1>
          <p className="page-subtitle">
            Configure access control permissions, invite accountants or project managers, and monitor immutable security audit logs.
          </p>
        </div>

        <button onClick={() => setShowInviteModal(true)} className="btn btn-primary">
          <Plus size={16} />
          <span>Invite Team Member</span>
        </button>
      </div>

      {/* Tabs */}
      <div className="card" style={{ padding: '0.5rem' }}>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            onClick={() => setActiveTab('members')}
            className={`btn btn-sm ${activeTab === 'members' ? 'btn-primary' : 'btn-outline'}`}
            style={{ border: 'none' }}
          >
            <ShieldCheck size={14} />
            <span>Team Members ({team.length})</span>
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

      {/* Tab 1: Team Members */}
      {activeTab === 'members' && (
        <>
          <div className="table-container responsive-desktop-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Member Name</th>
                  <th>Email Address</th>
                  <th>Role & Permissions</th>
                  <th>Status</th>
                  <th>Joined Date</th>
                  <th style={{ textAlign: 'right' }}>Actions</th>
                </tr>
              </thead>
              <tbody>
                {team.map((member) => (
                  <tr key={member.id}>
                    <td style={{ fontWeight: 700 }}>{member.name}</td>
                    <td style={{ color: 'var(--text-secondary)' }}>{member.email}</td>
                    <td>
                      <span className="badge badge-draft">
                        {member.role}
                      </span>
                    </td>
                    <td>
                      <span className="badge badge-active">{member.status}</span>
                    </td>
                    <td>{member.joinedDate}</td>
                    <td style={{ textAlign: 'right' }}>
                      {member.role !== 'Owner' && (
                        <button
                          onClick={() => onDeleteMember(member.id)}
                          className="btn btn-danger btn-sm"
                          title="Remove Member"
                        >
                          <Trash2 size={13} />
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <div className="responsive-mobile-cards">
            {team.map((member) => (
              <div key={`m-team-${member.id}`} className="mobile-data-card">
                <div className="mobile-data-card-header">
                  <div>
                    <div style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                      {member.name}
                    </div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      {member.email}
                    </div>
                  </div>
                  <div style={{ display: 'flex', gap: '0.35rem' }}>
                    <span className="badge badge-draft">{member.role}</span>
                    <span className="badge badge-active">{member.status}</span>
                  </div>
                </div>

                <div className="mobile-data-card-meta">
                  <div className="mobile-data-card-meta-row">
                    <span className="mobile-data-card-meta-label">Joined</span>
                    <span className="mobile-data-card-meta-value">{member.joinedDate}</span>
                  </div>
                </div>

                {member.role !== 'Owner' && (
                  <div className="mobile-data-card-actions">
                    <button
                      onClick={() => onDeleteMember(member.id)}
                      className="btn btn-danger btn-sm"
                      style={{ width: '100%', minHeight: '36px' }}
                    >
                      <Trash2 size={14} />
                      <span>Remove Member</span>
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        </>
      )}

      {/* Tab 2: Audit Logs */}
      {activeTab === 'audit' && (
        <>
          <div className="table-container responsive-desktop-table">
            <table className="data-table">
              <thead>
                <tr>
                  <th>Timestamp</th>
                  <th>User</th>
                  <th>Action</th>
                  <th>Entity</th>
                  <th>Activity Details</th>
                </tr>
              </thead>
              <tbody>
                {auditLogs.length === 0 ? (
                  <tr>
                    <td colSpan={5} style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                      No activity logs recorded yet.
                    </td>
                  </tr>
                ) : (
                  auditLogs.map((log) => (
                    <tr key={log.id}>
                      <td className="font-mono" style={{ fontSize: '0.75rem', color: 'var(--text-secondary)' }}>
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td style={{ fontWeight: 600 }}>{log.userName}</td>
                      <td>
                        <span className="badge badge-sent">{log.action}</span>
                      </td>
                      <td>{log.entityType}</td>
                      <td style={{ fontSize: '0.8rem', color: 'var(--text-primary)' }}>{log.details}</td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>

          <div className="responsive-mobile-cards">
            {auditLogs.length === 0 ? (
              <div className="card" style={{ textAlign: 'center', padding: '2rem', color: 'var(--text-muted)' }}>
                No activity logs recorded yet.
              </div>
            ) : (
              auditLogs.map((log) => (
                <div key={`m-log-${log.id}`} className="mobile-data-card">
                  <div className="mobile-data-card-header">
                    <div>
                      <div style={{ fontWeight: 700, fontSize: '0.875rem', color: 'var(--text-primary)' }}>
                        {log.userName}
                      </div>
                      <div className="font-mono" style={{ fontSize: '0.725rem', color: 'var(--text-secondary)', marginTop: '2px' }}>
                        {new Date(log.timestamp).toLocaleString()}
                      </div>
                    </div>
                    <span className="badge badge-sent">{log.action}</span>
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
                Invite New Team Member
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
                  <option value="Admin">Admin (Full invoicing & billing access)</option>
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
