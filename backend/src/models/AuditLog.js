import mongoose from 'mongoose';

/**
 * AuditLog Model
 * Tamper-resistant, append-only record of all security-sensitive and destructive events.
 * Updates and deletions are blocked at the schema level.
 */
const auditLogSchema = new mongoose.Schema(
  {
    action: {
      type: String,
      required: true,
      index: true,
      enum: [
        'SOFT_DELETE',
        'RESTORE',
        'APPROVAL_REQUESTED',
        'APPROVAL_GRANTED',
        'APPROVAL_REJECTED',
        'PERMANENT_PURGE_EXECUTED',
        'UNAUTHORIZED_DESTRUCTIVE_ATTEMPT',
        'DATABASE_RESET_BLOCKED',
        'SETTINGS_CHANGE',
        'SECURITY_CHECK',
      ],
    },
    entityType: {
      type: String,
      required: true,
      index: true,
    },
    entityId: {
      type: String,
      index: true,
    },
    entityIdentifier: {
      type: String,
    },
    performedBy: {
      userId: { type: String },
      name: { type: String, default: 'System' },
      email: { type: String, default: 'system@highphaus.com' },
      role: { type: String, default: 'System' },
    },
    authorizedBy: {
      userId: { type: String },
      name: { type: String },
      email: { type: String },
      role: { type: String },
    },
    reason: {
      type: String,
      default: '',
    },
    impact: {
      type: String,
      default: '',
    },
    status: {
      type: String,
      enum: ['success', 'rejected', 'blocked', 'pending', 'failed'],
      default: 'success',
      index: true,
    },
    details: {
      type: mongoose.Schema.Types.Mixed,
      default: {},
    },
    ipAddress: {
      type: String,
      default: '',
    },
    userAgent: {
      type: String,
      default: '',
    },
    isTamperProof: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: { createdAt: true, updatedAt: false }, // Append-only (no updatedAt)
  }
);

// Enforce immutability: block updates and deletions on audit log collection
const blockMutation = function (next) {
  const err = new Error(
    'CRITICAL SECURITY EXCEPTION: Audit logs are append-only and strictly tamper-resistant. Updates and deletions are forbidden.'
  );
  next(err);
};

auditLogSchema.pre('updateOne', blockMutation);
auditLogSchema.pre('updateMany', blockMutation);
auditLogSchema.pre('findOneAndUpdate', blockMutation);
auditLogSchema.pre('deleteOne', blockMutation);
auditLogSchema.pre('deleteMany', blockMutation);
auditLogSchema.pre('findOneAndDelete', blockMutation);
auditLogSchema.pre('findOneAndRemove', blockMutation);

export const AuditLog = mongoose.models.AuditLog || mongoose.model('AuditLog', auditLogSchema);
export default AuditLog;
