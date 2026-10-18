import mongoose from 'mongoose';

/**
 * ApprovalRequest Model
 * Implements two-step authorization workflow for sensitive and destructive operations.
 * Operations require explicit review and signature by the designated workspace Owner.
 */
const approvalRequestSchema = new mongoose.Schema(
  {
    requestId: {
      type: String,
      required: true,
      unique: true,
      index: true,
    },
    operation: {
      type: String,
      required: true,
      enum: [
        'PERMANENT_PURGE',
        'BULK_DELETE',
        'DATABASE_RESET',
        'PERMANENT_RECORD_DELETE',
        'EXPORT_ALL_DATA',
      ],
      index: true,
    },
    entityType: {
      type: String,
      required: true,
    },
    targetIds: [
      {
        type: String,
      },
    ],
    targetIdentifiers: [
      {
        type: String,
      },
    ],
    reason: {
      type: String,
      required: true,
    },
    impactSummary: {
      type: String,
      default: '',
    },
    recordCount: {
      type: Number,
      default: 1,
    },
    status: {
      type: String,
      enum: ['pending', 'approved', 'rejected', 'executed', 'expired', 'revoked'],
      default: 'pending',
      index: true,
    },
    requestedBy: {
      userId: { type: String },
      name: { type: String, required: true },
      email: { type: String, required: true },
      role: { type: String, default: 'Admin' },
    },
    approvedBy: {
      userId: { type: String },
      name: { type: String },
      email: { type: String },
      role: { type: String },
      approvedAt: { type: Date },
      approvalReason: { type: String },
    },
    rejectedBy: {
      userId: { type: String },
      name: { type: String },
      email: { type: String },
      role: { type: String },
      rejectedAt: { type: Date },
      rejectionReason: { type: String },
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true,
    },
    executedAt: {
      type: Date,
    },
    executedBy: {
      userId: { type: String },
      name: { type: String },
      email: { type: String },
      role: { type: String },
    },
    executionResult: {
      type: mongoose.Schema.Types.Mixed,
    },
  },
  {
    timestamps: true,
  }
);

export const ApprovalRequest =
  mongoose.models.ApprovalRequest || mongoose.model('ApprovalRequest', approvalRequestSchema);
export default ApprovalRequest;
