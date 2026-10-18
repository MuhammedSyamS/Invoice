/**
 * Production Data Protection Soft-Delete Plugin
 * Enforces non-destructive operations: records are marked as deleted with full
 * audit trail (deletedAt, deletedBy, deletionReason) instead of being purged from MongoDB Atlas.
 */
export const applySoftDelete = (schema) => {
  schema.add({
    isDeleted: { type: Boolean, default: false, index: true },
    deletedAt: { type: Date, default: null },
    deletedBy: { type: String, default: null },
    deletionReason: { type: String, default: null },
  });

  // Query helper to filter out soft-deleted records by default
  schema.query.active = function () {
    return this.where({ isDeleted: { $ne: true } });
  };

  // Instance method to safely soft-delete
  schema.methods.softDelete = async function (deletedBy = 'Admin', reason = '') {
    this.isDeleted = true;
    this.deletedAt = new Date();
    this.deletedBy = deletedBy;
    this.deletionReason = reason || 'User requested deletion';
    return this.save();
  };

  // Instance method to restore soft-deleted record
  schema.methods.restore = async function () {
    this.isDeleted = false;
    this.deletedAt = null;
    this.deletedBy = null;
    this.deletionReason = null;
    return this.save();
  };
};

export default applySoftDelete;
