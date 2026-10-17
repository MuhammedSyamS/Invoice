import express from 'express';
import { User } from '../models/User.js';

const router = express.Router();

// Helper to seed initial workspace owner if not already in DB
const ensureInitialOwner = async () => {
  try {
    const owner = await User.findOne({ email: 'admin@highphaus.com' });
    if (!owner) {
      await User.create({
        name: 'Highphaus Owner',
        email: 'admin@highphaus.com',
        password: 'admin123',
        role: 'Owner',
        status: 'approved',
        approvedBy: 'System Initializer',
        approvedAt: new Date(),
      });
      console.log('[Auth] Initial workspace Owner user seeded successfully in MongoDB.');
    }
  } catch (err) {
    console.error('[Auth] Error checking initial owner:', err.message);
  }
};

// GET /api/users - List all users with role and approval status
router.get('/', async (req, res, next) => {
  try {
    await ensureInitialOwner();
    const users = await User.find().select('-password').sort({ createdAt: -1 });
    res.json({ success: true, data: users });
  } catch (err) {
    next(err);
  }
});

// POST /api/users/register - Register new user account
router.post('/register', async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) {
      return res.status(400).json({ success: false, error: 'Name, email, and password are required.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const cleanName = name.trim();

    const existing = await User.findOne({ email: cleanEmail });
    if (existing) {
      return res.status(409).json({ success: false, error: 'An account with this email address is already registered. Please sign in or use a different email.' });
    }

    const userCount = await User.countDocuments();
    // First user is automatically approved workspace Owner
    const isFirstUser = userCount === 0;
    const finalRole = isFirstUser ? 'Owner' : (role || 'Admin');
    const finalStatus = isFirstUser ? 'approved' : 'pending';

    const newUser = await User.create({
      name: cleanName,
      email: cleanEmail,
      password,
      role: finalRole,
      status: finalStatus,
      approvedBy: isFirstUser ? 'System Initializer' : null,
      approvedAt: isFirstUser ? new Date() : null,
    });

    res.status(201).json({
      success: true,
      message:
        finalStatus === 'approved'
          ? 'Workspace Owner account created successfully!'
          : 'Account submitted! Your access is pending approval from the Workspace Owner.',
      user: {
        id: newUser._id.toString(),
        name: newUser.name,
        email: newUser.email,
        role: newUser.role,
        status: newUser.status,
      },
    });
  } catch (err) {
    next(err);
  }
});

// POST /api/users/login - Authenticate user & verify approval status
router.post('/login', async (req, res, next) => {
  try {
    await ensureInitialOwner();

    const { email, password } = req.body;
    if (!email || !password) {
      return res.status(400).json({ success: false, error: 'Please provide both email and password.' });
    }

    const cleanEmail = email.trim().toLowerCase();
    const user = await User.findOne({ email: cleanEmail });

    if (!user) {
      // Fallback for default admin credentials if not seeded
      if (cleanEmail === 'admin@highphaus.com' && (password === 'admin123' || password === 'admin')) {
        const seededOwner = await User.create({
          name: 'Highphaus Owner',
          email: 'admin@highphaus.com',
          password: 'admin123',
          role: 'Owner',
          status: 'approved',
          approvedBy: 'System Fallback',
          approvedAt: new Date(),
        });
        return res.json({
          success: true,
          message: 'Welcome back, Workspace Owner!',
          user: {
            id: seededOwner._id.toString(),
            name: seededOwner.name,
            email: seededOwner.email,
            role: seededOwner.role,
            status: seededOwner.status,
          },
        });
      }
      return res.status(404).json({ success: false, error: 'No account found with this email address. Please check your email or create an account.' });
    }

    if (user.password !== password) {
      return res.status(401).json({ success: false, error: 'Incorrect password entered. Please check your password and try again.' });
    }

    // Check approval status
    if (user.status === 'pending') {
      return res.status(403).json({
        success: false,
        status: 'pending',
        error:
          'Your account is currently PENDING approval from the Workspace Owner. You cannot sign in until the owner approves your request.',
      });
    }

    if (user.status === 'rejected') {
      return res.status(403).json({
        success: false,
        status: 'rejected',
        error: user.rejectedReason
          ? `Your access request was REJECTED by the Workspace Owner. Reason: ${user.rejectedReason}`
          : 'Your access request was REJECTED by the Workspace Owner.',
      });
    }

    user.lastLoginAt = new Date();
    await user.save();

    res.json({
      success: true,
      message: `Welcome back, ${user.name}!`,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
      },
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/users/:id/approve - Owner approves user access
router.patch('/:id/approve', async (req, res, next) => {
  try {
    const { approvedBy } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found in database.' });
    }

    user.status = 'approved';
    user.approvedBy = approvedBy || 'Workspace Owner';
    user.approvedAt = new Date();
    user.rejectedReason = null;
    await user.save();

    res.json({
      success: true,
      message: `User ${user.name} (${user.email}) has been APPROVED. They can now log in.`,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        approvedBy: user.approvedBy,
        approvedAt: user.approvedAt,
      },
    });
  } catch (err) {
    next(err);
  }
});

// PATCH /api/users/:id/reject - Owner rejects user access
router.patch('/:id/reject', async (req, res, next) => {
  try {
    const { rejectedBy, reason } = req.body;
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found in database.' });
    }

    user.status = 'rejected';
    user.approvedBy = rejectedBy || 'Workspace Owner';
    user.approvedAt = new Date();
    user.rejectedReason = reason || 'Access request rejected by Workspace Owner.';
    await user.save();

    res.json({
      success: true,
      message: `User ${user.name} (${user.email}) has been REJECTED.`,
      user: {
        id: user._id.toString(),
        name: user.name,
        email: user.email,
        role: user.role,
        status: user.status,
        rejectedReason: user.rejectedReason,
      },
    });
  } catch (err) {
    next(err);
  }
});

// DELETE /api/users/:id - Delete user from database
router.delete('/:id', async (req, res, next) => {
  try {
    const user = await User.findById(req.params.id);
    if (!user) {
      return res.status(404).json({ success: false, error: 'User not found.' });
    }
    if (user.role === 'Owner') {
      return res.status(400).json({ success: false, error: 'Workspace Owner account cannot be deleted.' });
    }

    await User.findByIdAndDelete(req.params.id);
    res.json({ success: true, message: `User ${user.name} deleted successfully.` });
  } catch (err) {
    next(err);
  }
});

export default router;
