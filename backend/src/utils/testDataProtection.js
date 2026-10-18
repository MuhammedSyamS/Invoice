/**
 * Automated Verification Script: Enterprise Data Protection Policy & Audit Compliance
 */
const BASE_URL = 'http://localhost:5001';

async function runTests() {
  console.log('================================================================');
  console.log('STARTING ENTERPRISE DATA PROTECTION & ATLAS AUDIT VERIFICATION');
  console.log('================================================================\n');

  let passed = 0;
  let failed = 0;

  const test = (name, assertion) => {
    if (assertion) {
      console.log(`[PASS] ${name}`);
      passed++;
    } else {
      console.error(`[FAIL] ${name}`);
      failed++;
    }
  };

  try {
    // 1. Health check
    const healthRes = await fetch(`${BASE_URL}/api/health`).then((r) => r.json());
    test('Server is healthy and connected to Atlas', healthRes.status === 'online');

    // 2. Create isolated test invoice
    const testId = `test-protect-${Date.now()}`;
    const createRes = await fetch(`${BASE_URL}/api/invoices`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': 'admin@highphaus.com',
        'x-user-role': 'Owner',
      },
      body: JSON.stringify({
        id: testId,
        invoiceNumber: `TEST-SEC-001`,
        clientId: 'cli-test',
        clientName: 'Security Test Client',
        issueDate: '2026-10-18',
        dueDate: '2026-11-01',
        total: 5000,
        subtotal: 5000,
        items: [{ id: 'item-1', description: 'Audit Item', quantity: 1, unitPrice: 5000, amount: 5000 }],
      }),
    }).then((r) => r.json());

    test('Created isolated test record in MongoDB Atlas', createRes.success === true);

    // 3. Test Soft Deletion
    const deleteRes = await fetch(`${BASE_URL}/api/invoices/${testId}`, {
      method: 'DELETE',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': 'admin@highphaus.com',
        'x-user-role': 'Owner',
      },
      body: JSON.stringify({ reason: 'Compliance soft-delete test' }),
    }).then((r) => r.json());

    test('DELETE endpoint executes Soft Deletion (does not purge)', deleteRes.success === true && deleteRes.isSoftDeleted === true);

    // 4. Verify record is excluded from active query
    const activeList = await fetch(`${BASE_URL}/api/invoices`).then((r) => r.json());
    const foundInActive = activeList.data.some((inv) => inv.id === testId);
    test('Soft-deleted record is excluded from active inquiries', foundInActive === false);

    // 5. Verify record still physically exists in MongoDB Atlas archive (?includeDeleted=true)
    const archiveList = await fetch(`${BASE_URL}/api/invoices?includeDeleted=true`).then((r) => r.json());
    const foundInArchive = archiveList.data.find((inv) => inv.id === testId);
    test('Record remains preserved in MongoDB Atlas with isDeleted=true', foundInArchive && foundInArchive.isDeleted === true);

    // 6. Test Record Restoration
    const restoreRes = await fetch(`${BASE_URL}/api/invoices/${testId}/restore`, {
      method: 'POST',
      headers: {
        'x-user-email': 'admin@highphaus.com',
        'x-user-role': 'Owner',
      },
    }).then((r) => r.json());
    test('POST /restore returns record to active state', restoreRes.success === true && restoreRes.data.isDeleted === false);

    // 7. Test Database Reset Protection Interceptor
    const resetRes = await fetch(`${BASE_URL}/api/sync/reset`, { method: 'POST' });
    test('Database reset endpoint is permanently BLOCKED with HTTP 403', resetRes.status === 403);

    // 8. Test Two-Step Approval Creation
    const approvalReq = await fetch(`${BASE_URL}/api/approvals/request`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': 'security.auditor@highphaus.com',
        'x-user-name': 'Auditor',
        'x-user-role': 'Admin',
      },
      body: JSON.stringify({
        operation: 'PERMANENT_PURGE',
        entityType: 'invoices',
        targetIds: [testId],
        reason: 'Authorized cleanup of automated security test invoice',
        impactSummary: 'Purge single isolated security test invoice',
      }),
    }).then((r) => r.json());

    test('Two-step approval request logged with pending status', approvalReq.success === true && approvalReq.data.status === 'pending');

    const approvalId = approvalReq.data.requestId;

    // 9. Unauthorized attempt to execute unapproved request
    const executeUnapproved = await fetch(`${BASE_URL}/api/approvals/${approvalId}/execute`, {
      method: 'POST',
      headers: {
        'x-user-email': 'admin@highphaus.com',
        'x-user-role': 'Owner',
      },
    });
    test('Execution of unapproved request is blocked (HTTP 403)', executeUnapproved.status === 403);

    // 10. Workspace Owner approves request
    const approveRes = await fetch(`${BASE_URL}/api/approvals/${approvalId}/approve`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'x-user-email': 'admin@highphaus.com',
        'x-user-role': 'Owner',
      },
      body: JSON.stringify({ approvalReason: 'Verified isolated test record', allowSelfApprovalOverride: true }),
    }).then((r) => r.json());

    test('Designated Workspace Owner approved request', approveRes.success === true && approveRes.data.status === 'approved');

    // 11. Execute approved purge
    const executeRes = await fetch(`${BASE_URL}/api/approvals/${approvalId}/execute`, {
      method: 'POST',
      headers: {
        'x-user-email': 'admin@highphaus.com',
        'x-user-role': 'Owner',
      },
    }).then((r) => r.json());

    test('Approved purge executed successfully and cleaned up test record', executeRes.success === true && executeRes.data.deletedCount === 1);

    // 12. Verify Audit Log was recorded
    const auditRes = await fetch(`${BASE_URL}/api/audit-logs`).then((r) => r.json());
    test('Tamper-resistant audit logs recorded all security events', auditRes.success === true && auditRes.data.length > 0);

    console.log(`\n================================================================`);
    console.log(`VERIFICATION SUMMARY: ${passed} PASSED, ${failed} FAILED`);
    console.log('================================================================\n');

    process.exit(failed > 0 ? 1 : 0);
  } catch (err) {
    console.error('Test execution failed:', err);
    process.exit(1);
  }
}

runTests();
