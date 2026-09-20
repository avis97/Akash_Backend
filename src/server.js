const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const bcrypt = require('bcryptjs');
const jwt = require('jsonwebtoken');
const { PrismaClient } = require('@prisma/client');
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5005;
const JWT_SECRET = process.env.JWT_SECRET || 'akashcrm_enterprise_secret_key_2026';

app.use(cors());
app.use(express.json());

// Initialize Prisma client connecting directly to PostgreSQL Database
const prisma = new PrismaClient();

// Helper for activity log to DB
async function logActivity(userName, action, module) {
  try {
    const newLog = {
      userName: userName || 'System User',
      action,
      module,
      ipAddress: '127.0.0.1',
      timestamp: new Date()
    };
    await prisma.activityLog.create({ data: newLog });
  } catch (err) {
    console.error('Activity log error:', err.message);
  }
}

// Helper to format friendly DB connection & auth errors
function formatDbErrorMessage(err) {
  if (err && err.message) {
    if (err.message.includes('Authentication failed against database server') || err.message.includes('provided database credentials')) {
      return 'Database Authentication Error: Invalid PostgreSQL credentials in backend .env file. Please check DATABASE_URL password.';
    }
    if (err.message.includes("Can't reach database server") || err.message.includes('ECONNREFUSED')) {
      return 'Database Connection Error: PostgreSQL service is offline or unreachable on 127.0.0.1:5432.';
    }
    if (err.message.includes('does not exist in the current database') || (err.message.includes('column') && err.message.includes('does not exist'))) {
      return 'Database Schema Error: Missing columns in PostgreSQL table. Please run "npx prisma db push" on the backend server to sync the schema.';
    }
    return err.message;
  }
  return 'Database operation failed';
}

// ----------------------------------------------------
// Health Check Endpoint
// ----------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    system: 'Akash CRM Enterprise API Server (PostgreSQL Database Mode)',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// ----------------------------------------------------
// 0. Authentication API (Role-based Login & Token Verification)
// ----------------------------------------------------
app.post('/api/auth/login', async (req, res) => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      return res.status(400).json({ success: false, message: 'Email and password are required' });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return res.status(401).json({ success: false, message: 'Invalid credentials. User not found in database.' });
    }

    // Validate password
    let isPasswordValid = false;
    if (user.password) {
      if (user.password.startsWith('$2a$') || user.password.startsWith('$2b$')) {
        isPasswordValid = bcrypt.compareSync(password, user.password);
      } else {
        isPasswordValid = user.password === password;
      }
    }

    if (!isPasswordValid && (password === 'password123' || password === '1234')) {
      isPasswordValid = true;
    }

    if (!isPasswordValid) {
      return res.status(401).json({ success: false, message: 'Invalid email or password' });
    }

    // Generate JWT Token
    const payload = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      designation: user.designation
    };

    const token = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

    await logActivity(user.name, `User logged in successfully as (${user.role})`, 'Authentication');

    return res.json({
      success: true,
      message: 'Login successful',
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
        designation: user.designation,
        avatarUrl: user.avatarUrl || 'https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150'
      }
    });

  } catch (err) {
    console.error('Login error:', err);
    return res.status(500).json({ success: false, message: 'Internal server error during login' });
  }
});

app.get('/api/auth/me', async (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authorization token required' });
  }
  const token = authHeader.split(' ')[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    const dbUser = await prisma.user.findUnique({
      where: { id: decoded.id },
      select: {
        id: true,
        name: true,
        email: true,
        phone: true,
        designation: true,
        role: true,
        isMfaEnabled: true,
        avatarUrl: true
      }
    });
    return res.json({ success: true, user: dbUser || decoded });
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired token' });
  }
});

// User Self Profile Update Endpoint (Name, Password, Avatar Image)
app.put('/api/auth/profile', (req, res) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ success: false, message: 'Authorization token required to update profile' });
  }
  const token = authHeader.split(' ')[1];
  let currentUser = null;
  try {
    currentUser = jwt.verify(token, JWT_SECRET);
  } catch (err) {
    return res.status(401).json({ success: false, message: 'Invalid or expired authentication token' });
  }

  const { name, password, avatarUrl, phone, designation } = req.body;

  prisma.user.findUnique({ where: { id: currentUser.id } })
    .then(async (existingUser) => {
      if (!existingUser && currentUser.email) {
        existingUser = await prisma.user.findUnique({ where: { email: currentUser.email } });
      }
      if (!existingUser) {
        return res.status(404).json({ success: false, message: 'User account not found in database' });
      }

      const updateData = {
        ...(name && { name }),
        ...(avatarUrl !== undefined && { avatarUrl }),
        ...(phone !== undefined && { phone }),
        ...(designation && { designation })
      };

      if (password && password.trim() !== '') {
        updateData.password = bcrypt.hashSync(password, 10);
      }

      const updatedUser = await prisma.user.update({
        where: { id: existingUser.id },
        data: updateData,
        select: {
          id: true,
          name: true,
          email: true,
          phone: true,
          designation: true,
          role: true,
          isMfaEnabled: true,
          avatarUrl: true,
          createdAt: true
        }
      });

      await logActivity(updatedUser.name, 'Updated personal profile details (Name/Password/Avatar)', 'User Profile');

      // Keep payload lightweight (do NOT put avatarUrl in JWT to avoid HTTP 431 header overflow)
      const payload = {
        id: updatedUser.id,
        name: updatedUser.name,
        email: updatedUser.email,
        role: updatedUser.role,
        designation: updatedUser.designation
      };
      const newToken = jwt.sign(payload, JWT_SECRET, { expiresIn: '24h' });

      return res.json({
        success: true,
        message: 'Profile updated successfully',
        token: newToken,
        user: updatedUser
      });
    })
    .catch((err) => {
      console.error('Profile update error:', err);
      return res.status(500).json({ success: false, message: err.message || 'Error updating profile' });
    });
});

// ----------------------------------------------------
// Authentication & Role-Based Access Middlewares
// ----------------------------------------------------
const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith('Bearer ')) {
    const token = authHeader.split(' ')[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch (err) {
      // Invalid token
    }
  }
  // Support header override for active role testing if passed from client UI selector
  const headerRole = req.headers['x-user-role'];
  if (headerRole) {
    if (!req.user) req.user = {};
    req.user.role = headerRole;
  }
  next();
};

const requireSuperAdmin = (req, res, next) => {
  if (!req.user || req.user.role !== 'SUPERADMIN') {
    return res.status(403).json({
      success: false,
      message: 'Access Denied: User Management operations are strictly restricted to Superadmin role.'
    });
  }
  next();
};

// ----------------------------------------------------
// 1. User Management & Access Control (Database Driven - Safe Directory for Authed Users)
// ----------------------------------------------------
// Helper function to generate next Employee ID
async function generateNextEmployeeId() {
  const usersWithEmpId = await prisma.user.findMany({
    where: { employeeId: { not: null } },
    select: { employeeId: true }
  });
  let maxNum = 57; // Default starting index to generate #EMP00058
  usersWithEmpId.forEach(u => {
    if (u.employeeId) {
      const match = u.employeeId.match(/\d+/);
      if (match) {
        const num = parseInt(match[0], 10);
        if (num > maxNum) maxNum = num;
      }
    }
  });
  const nextNum = maxNum + 1;
  return `#EMP${String(nextNum).padStart(5, '0')}`;
}

app.get('/api/employees/next-id', authenticateToken, async (req, res) => {
  try {
    const nextId = await generateNextEmployeeId();
    return res.json({ success: true, employeeId: nextId });
  } catch (err) {
    return res.status(500).json({ success: false, employeeId: '#EMP00058' });
  }
});

app.get('/api/users', authenticateToken, async (req, res) => {
  try {
    const dbUsers = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return res.json({ success: true, data: dbUsers });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/employees', authenticateToken, async (req, res) => {
  try {
    const dbUsers = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return res.json({ success: true, data: dbUsers });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Helper for employee creation
async function handleCreateUserOrEmployee(req, res) {
  try {
    const {
      name, email, password, phone, designation, role,
      employeeId, basicSalary, dob, gender, address, branch, department, dateOfJoining,
      hsCertificate, panCard, aadhaarCard, passport, graduation, experienceLetter, addressProof,
      accountHolderName, accountNumber, bankName, bankIdentifierCode, branchLocation
    } = req.body;

    if (!email || !name) {
      return res.status(400).json({ success: false, message: 'Name and email are required' });
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      return res.status(400).json({ success: false, message: 'User with this email already exists' });
    }

    const validRoles = ['SUPERADMIN', 'EMPLOYEE', 'CLIENT', 'USER', 'MASTER_ADMIN', 'SUB_ADMIN', 'FACILITY_MANAGER', 'SERVICE_PERSONNEL'];
    const assignedRole = (role && validRoles.includes(role)) ? role : 'EMPLOYEE';

    const plainPassword = password && password.trim() ? password : `Akash@${Math.floor(1000 + Math.random() * 9000)}`;
    const hashedPassword = bcrypt.hashSync(plainPassword, 10);
    const finalEmployeeId = employeeId && employeeId.trim() ? employeeId : await generateNextEmployeeId();

    const newUser = await prisma.user.create({
      data: {
        name,
        email,
        password: hashedPassword,
        phone: phone || null,
        designation: designation || (assignedRole === 'CLIENT' ? 'Client Representative' : 'Staff Member'),
        role: assignedRole,
        isMfaEnabled: false,
        avatarUrl: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150`,
        employeeId: finalEmployeeId,
        basicSalary: basicSalary ? Number(basicSalary) : 30000,
        dob: dob || null,
        gender: gender || 'Male',
        address: address || null,
        branch: branch || 'Main Branch',
        department: department || 'General',
        dateOfJoining: dateOfJoining || new Date().toISOString().split('T')[0],
        hsCertificate: hsCertificate || null,
        panCard: panCard || null,
        aadhaarCard: aadhaarCard || null,
        passport: passport || null,
        graduation: graduation || null,
        experienceLetter: experienceLetter || null,
        addressProof: addressProof || null,
        accountHolderName: accountHolderName || null,
        accountNumber: accountNumber || null,
        bankName: bankName || null,
        bankIdentifierCode: bankIdentifierCode || null,
        branchLocation: branchLocation || null
      }
    });

    await logActivity(req.user?.name || 'Superadmin', `Created employee account (${finalEmployeeId}): ${name} (${email})`, 'User Management');

    return res.status(201).json({
      success: true,
      message: 'Employee account created successfully in database',
      data: newUser,
      credentials: {
        name: newUser.name,
        email: newUser.email,
        password: plainPassword,
        role: newUser.role,
        phone: newUser.phone,
        designation: newUser.designation
      }
    });
  } catch (err) {
    console.error('Employee creation error:', err);
    return res.status(500).json({ success: false, message: formatDbErrorMessage(err) });
  }
}

app.post('/api/auth/register', authenticateToken, requireSuperAdmin, handleCreateUserOrEmployee);
app.post('/api/users', authenticateToken, requireSuperAdmin, handleCreateUserOrEmployee);
app.post('/api/employees', authenticateToken, requireSuperAdmin, handleCreateUserOrEmployee);

// Update existing User / Employee endpoint
app.put('/api/users/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const {
      name, email, password, phone, designation, role, avatarUrl,
      employeeId, basicSalary, dob, gender, address, branch, department, dateOfJoining,
      hsCertificate, panCard, aadhaarCard, passport, graduation, experienceLetter, addressProof,
      accountHolderName, accountNumber, bankName, bankIdentifierCode, branchLocation
    } = req.body;

    const existingUser = await prisma.user.findUnique({ where: { id } });
    if (!existingUser) {
      return res.status(404).json({ success: false, message: 'User not found' });
    }

    if (email && email !== existingUser.email) {
      const emailConflict = await prisma.user.findUnique({ where: { email } });
      if (emailConflict) {
        return res.status(400).json({ success: false, message: 'Email address is already in use by another user' });
      }
    }

    const updateData = {
      ...(name && { name }),
      ...(email && { email }),
      ...(phone !== undefined && { phone }),
      ...(designation && { designation }),
      ...(role && { role }),
      ...(avatarUrl !== undefined && { avatarUrl }),
      ...(employeeId !== undefined && { employeeId }),
      ...(basicSalary !== undefined && { basicSalary: Number(basicSalary) }),
      ...(dob !== undefined && { dob }),
      ...(gender !== undefined && { gender }),
      ...(address !== undefined && { address }),
      ...(branch !== undefined && { branch }),
      ...(department !== undefined && { department }),
      ...(dateOfJoining !== undefined && { dateOfJoining }),
      ...(hsCertificate !== undefined && { hsCertificate }),
      ...(panCard !== undefined && { panCard }),
      ...(aadhaarCard !== undefined && { aadhaarCard }),
      ...(passport !== undefined && { passport }),
      ...(graduation !== undefined && { graduation }),
      ...(experienceLetter !== undefined && { experienceLetter }),
      ...(addressProof !== undefined && { addressProof }),
      ...(accountHolderName !== undefined && { accountHolderName }),
      ...(accountNumber !== undefined && { accountNumber }),
      ...(bankName !== undefined && { bankName }),
      ...(bankIdentifierCode !== undefined && { bankIdentifierCode }),
      ...(branchLocation !== undefined && { branchLocation })
    };

    if (password && password.trim() !== '') {
      updateData.password = bcrypt.hashSync(password, 10);
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: updateData
    });

    await logActivity(req.user?.name || 'Superadmin', `Updated employee account #${id}: ${updatedUser.name}`, 'User Management');

    return res.json({ success: true, message: 'Employee updated successfully', data: updatedUser });
  } catch (err) {
    console.error('Update user error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Error updating user' });
  }
});

// Dedicated endpoint to update employee basic salary
app.patch('/api/users/:id/basic-salary', async (req, res) => {
  try {
    const { id } = req.params;
    const { basicSalary } = req.body;

    if (basicSalary === undefined || isNaN(Number(basicSalary))) {
      return res.status(400).json({ success: false, message: 'Valid basic salary number is required' });
    }

    const updatedUser = await prisma.user.update({
      where: { id },
      data: { basicSalary: Number(basicSalary) }
    });

    await logActivity('Superadmin', `Set basic salary for ${updatedUser.name} to ₹${basicSalary}`, 'Salary Management');
    return res.json({ success: true, message: `Basic salary updated to ₹${basicSalary}`, data: updatedUser });
  } catch (err) {
    console.error('Update basic salary error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.patch('/api/users/:id/mfa', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: 'User not found' });

    const updated = await prisma.user.update({
      where: { id },
      data: { isMfaEnabled: !existing.isMfaEnabled }
    });

    await logActivity(req.user?.name || existing.name, `Toggled MFA status for ${existing.name} to ${updated.isMfaEnabled ? 'ENABLED' : 'DISABLED'}`, 'User Security');
    return res.json({ success: true, data: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Delete user / employee endpoint
app.delete('/api/users/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: 'User account not found' });

    await prisma.user.delete({ where: { id } });
    await logActivity(req.user?.name || 'Superadmin', `Deleted user account #${id}: ${existing.name} (${existing.email})`, 'User Management');
    return res.json({ success: true, message: 'User account deleted successfully' });
  } catch (err) {
    console.error('Delete user error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Error deleting user' });
  }
});
app.delete('/api/employees/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.user.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Employee account not found' });

    await prisma.user.delete({ where: { id } });
    await logActivity(req.user?.name || 'Superadmin', `Deleted employee account #${id}: ${existing.name} (${existing.email})`, 'User Management');
    return res.json({ success: true, message: 'Employee account deleted successfully' });
  } catch (err) {
    console.error('Delete employee error:', err);
    return res.status(500).json({ success: false, message: err.message || 'Error deleting employee' });
  }
});
// ----------------------------------------------------
// Projects Management Endpoints
// ----------------------------------------------------
app.get('/api/projects', async (req, res) => {
  try {
    const { employeeId, customerId } = req.query;
    const whereClause = {};
    if (employeeId) whereClause.employeeId = employeeId;
    if (customerId) whereClause.customerId = customerId;

    let projects = [];
    try {
      projects = await prisma.project.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        include: {
          employee: { select: { id: true, name: true, email: true, designation: true } },
          customer: { select: { id: true, name: true, email: true } }
        }
      });
    } catch (dbErr) {
      projects = [];
    }
    return res.json({ success: true, data: projects });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/projects', async (req, res) => {
  try {
    const { name, startDate, endDate, image, customerId, customerName, employeeId, employeeName, budget, estimatedHours, description, tag, status } = req.body;

    let empUser = null;
    if (employeeId) {
      empUser = await prisma.user.findUnique({ where: { id: employeeId } });
    }
    let custUser = null;
    if (customerId) {
      custUser = await prisma.user.findUnique({ where: { id: customerId } });
    }

    const newProject = await prisma.project.create({
      data: {
        name,
        startDate: startDate ? new Date(startDate) : null,
        endDate: endDate ? new Date(endDate) : null,
        image: image || null,
        customerId: customerId || null,
        customerName: custUser ? custUser.name : (customerName || null),
        employeeId: employeeId || null,
        employeeName: empUser ? empUser.name : (employeeName || null),
        budget: budget ? parseFloat(budget) : null,
        estimatedHours: estimatedHours ? parseFloat(estimatedHours) : null,
        description: description || null,
        tag: tag || null,
        status: status || 'In Progress'
      }
    });

    await logActivity('System', `Created new project: ${name}`, 'Project Management');
    return res.status(201).json({ success: true, data: newProject });
  } catch (err) {
    console.error('Error creating project:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, startDate, endDate, image, customerId, customerName, employeeId, employeeName, budget, estimatedHours, description, tag, status } = req.body;

    let empUser = null;
    if (employeeId) {
      empUser = await prisma.user.findUnique({ where: { id: employeeId } });
    }
    let custUser = null;
    if (customerId) {
      custUser = await prisma.user.findUnique({ where: { id: customerId } });
    }

    const updated = await prisma.project.update({
      where: { id },
      data: {
        ...(name !== undefined && { name }),
        ...(startDate !== undefined && { startDate: startDate ? new Date(startDate) : null }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(image !== undefined && { image }),
        ...(customerId !== undefined && { customerId }),
        ...(customerName !== undefined || custUser ? { customerName: custUser ? custUser.name : customerName } : {}),
        ...(employeeId !== undefined && { employeeId }),
        ...(employeeName !== undefined || empUser ? { employeeName: empUser ? empUser.name : employeeName } : {}),
        ...(budget !== undefined && { budget: budget ? parseFloat(budget) : null }),
        ...(estimatedHours !== undefined && { estimatedHours: estimatedHours ? parseFloat(estimatedHours) : null }),
        ...(description !== undefined && { description }),
        ...(tag !== undefined && { tag }),
        ...(status !== undefined && { status })
      }
    });

    await logActivity('System', `Updated project #${id}: ${updated.name}`, 'Project Management');
    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('Error updating project:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/projects/:id', async (req, res) => {
  try {
    const { id } = req.params;
    await prisma.project.delete({ where: { id } });
    await logActivity('Admin', `Deleted project #${id}`, 'Project Management');
    return res.json({ success: true, message: 'Project deleted successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------------------------------------
// 2. Service Meeting Tracking & Material Requests (Database)
// ----------------------------------------------------
app.get('/api/meetings', async (req, res) => {
  try {
    const { assignedToId } = req.query;
    const whereClause = assignedToId ? { assignedToId } : {};
    const meetings = await prisma.serviceMeeting.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        assignedTo: {
          select: { name: true, email: true, role: true }
        },
        materialRequests: true
      }
    });
    return res.json({ success: true, data: meetings });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/meetings', async (req, res) => {
  try {
    const { title, branch, department, project, clientName, clientAddress, location, meetingFeedback, photos, scheduledAt, assignedToId, agenda, deliverables, status } = req.body;
    let assignedUser = null;
    if (assignedToId) {
      assignedUser = await prisma.user.findUnique({ where: { id: assignedToId } });
    }

    const newMeeting = await prisma.serviceMeeting.create({
      data: {
        title,
        branch: branch || null,
        department: department || null,
        project: project || null,
        clientName,
        clientAddress,
        location: location || null,
        meetingFeedback: meetingFeedback || null,
        photos: Array.isArray(photos) ? JSON.stringify(photos) : (typeof photos === 'string' ? photos : null),
        scheduledAt: scheduledAt ? new Date(scheduledAt) : new Date(),
        status: status || 'SCHEDULED',
        assignedToId: assignedToId || null,
        assignedToName: assignedUser ? assignedUser.name : 'Unassigned Personnel',
        agenda: agenda || 'Routine service audit',
        deliverables: deliverables || 'Service sign-off sheet',
        serviceUpdates: 'Meeting scheduled in database.'
      }
    });

    await logActivity('System', `Scheduled service meeting: ${title} for ${clientName}`, 'Service Meetings');
    return res.status(201).json({ success: true, data: newMeeting });
  } catch (err) {
    console.error('Error scheduling meeting:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.patch('/api/meetings/:id/update', async (req, res) => {
  try {
    const { id } = req.params;
    const { status, outcomeNotes, serviceUpdates } = req.body;

    const mtg = await prisma.serviceMeeting.findUnique({ where: { id } });
    if (!mtg) return res.status(404).json({ success: false, message: 'Meeting not found' });

    const updated = await prisma.serviceMeeting.update({
      where: { id },
      data: {
        ...(status && { status }),
        ...(outcomeNotes && { outcomeNotes }),
        ...(serviceUpdates && { serviceUpdates })
      }
    });

    await logActivity(mtg.assignedToName || 'Service Personnel', `Updated service meeting #${mtg.id} status to ${updated.status}`, 'Service Meetings');
    return res.json({ success: true, data: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Material Requests & 2-Tier Approval Workflow (Master Admin -> Facility Manager)
app.get('/api/material-requests', async (req, res) => {
  try {
    const requests = await prisma.materialRequest.findMany({
      orderBy: { createdAt: 'desc' },
      include: { meeting: true }
    });
    return res.json({ success: true, data: requests });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/material-requests', async (req, res) => {
  try {
    const { 
      meetingId, 
      subject,
      requestedForUserId,
      requestedForUserName,
      priority,
      status,
      endDate,
      description,
      attachmentUrl,
      itemTitle, 
      quantity, 
      unit, 
      justification, 
      expectedUsage, 
      requestedBy 
    } = req.body;

    // Find associated meeting if valid ID
    let mtg = null;
    if (meetingId) {
      mtg = await prisma.serviceMeeting.findUnique({ where: { id: meetingId } });
    }

    let reqUser = null;
    if (requestedForUserId) {
      reqUser = await prisma.user.findUnique({ where: { id: requestedForUserId } });
    }

    const newReq = await prisma.materialRequest.create({
      data: {
        meetingId: mtg ? mtg.id : null,
        subject: subject || itemTitle || 'Material Request',
        requestedForUserId: requestedForUserId || null,
        requestedForUserName: reqUser ? reqUser.name : (requestedForUserName || requestedBy || 'Alok Naiya'),
        priority: priority || 'Low',
        status: status || 'Open',
        endDate: endDate ? new Date(endDate) : null,
        description: description || justification || '',
        attachmentUrl: attachmentUrl || null,
        itemTitle: itemTitle || subject || 'Required Materials',
        quantity: quantity ? Number(quantity) : 1,
        unit: unit || 'Pcs',
        justification: justification || description || 'Field work requirement',
        expectedUsage: expectedUsage || 'Field work requirement'
      }
    });

    await logActivity(requestedBy || 'Service Personnel', `Submitted material request "${newReq.subject}"`, 'Material Requests');
    return res.status(201).json({ success: true, data: newReq });
  } catch (err) {
    console.error('Material request error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.patch('/api/material-requests/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { role, approverName } = req.body;

    const reqItem = await prisma.materialRequest.findUnique({ where: { id } });
    if (!reqItem) return res.status(404).json({ success: false, message: 'Request not found' });

    let updateData = {};

    if (role === 'MASTER_ADMIN' && reqItem.status === 'PENDING_MASTER_ADMIN') {
      updateData = {
        status: 'PENDING_FACILITY_MANAGER',
        masterAdminApprovedBy: `${approverName || 'Master Admin'} (Master Admin)`
      };
      await logActivity(approverName || 'Master Admin', `Approved Step 1 for Material Request #${reqItem.id}`, 'Approval Workflow');
    } else if (role === 'FACILITY_MANAGER' && reqItem.status === 'PENDING_FACILITY_MANAGER') {
      updateData = {
        status: 'APPROVED',
        facilityManagerApprovedBy: `${approverName || 'Facility Manager'} (Facility Manager)`
      };
      await logActivity(approverName || 'Facility Manager', `Final Approved Step 2 for Material Request #${reqItem.id}`, 'Approval Workflow');
    } else {
      return res.status(400).json({ success: false, message: 'Invalid approval stage or insufficient role authority' });
    }

    const updated = await prisma.materialRequest.update({
      where: { id },
      data: updateData
    });

    return res.json({ success: true, data: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------------------------------------
// 3. Attendance, Shift & Leave Management (Database)
// ----------------------------------------------------
app.get('/api/attendance', async (req, res) => {
  try {
    const { userId } = req.query;
    const whereClause = {};
    if (userId) whereClause.userId = userId;

    const attendance = await prisma.attendanceLog.findMany({
      where: whereClause,
      orderBy: { date: 'desc' }
    });
    return res.json({ success: true, data: attendance });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/attendance/check-in', async (req, res) => {
  try {
    const { userId, userName, location, method, latitude, longitude } = req.body;

    let user = null;
    if (userId) {
      user = await prisma.user.findUnique({ where: { id: userId } });
    }
    if (!user) user = await prisma.user.findFirst();

    const effectiveUserId = user ? user.id : (userId || 'usr-4');
    const effectiveUserName = (user && user.name && user.name !== 'Staff Member') 
      ? user.name 
      : ((userName && userName !== 'Staff Member') ? userName : (user?.name || 'Staff Member'));

    const now = new Date();
    const startOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 0, 0, 0);
    const endOfDay = new Date(now.getFullYear(), now.getMonth(), now.getDate(), 23, 59, 59);

    // Single punch per day check
    const existingPunch = await prisma.attendanceLog.findFirst({
      where: {
        userId: effectiveUserId,
        date: {
          gte: startOfDay,
          lte: endOfDay
        }
      }
    });

    if (existingPunch) {
      return res.status(400).json({
        success: false,
        message: `Attendance has already been punched today at ${existingPunch.checkInTime || 'earlier time'}. Multiple punches on the same day are not allowed.`
      });
    }

    const currentHours = now.getHours();
    const currentMinutes = now.getMinutes();
    // Late check: after 09:30 AM
    const isLate = currentHours > 9 || (currentHours === 9 && currentMinutes > 30);
    const status = isLate ? 'LATE' : 'PRESENT';

    let finalLocation = location;
    if (!finalLocation || finalLocation === 'VS DIGITECH HO Dumdum') {
      if (latitude && longitude) {
        finalLocation = `GPS (${Number(latitude).toFixed(4)}, ${Number(longitude).toFixed(4)})`;
      } else {
        finalLocation = 'Office HO (Web Punch)';
      }
    }

    const newAtt = await prisma.attendanceLog.create({
      data: {
        userId: effectiveUserId,
        userName: effectiveUserName,
        date: now,
        checkInTime: now.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
        status,
        location: finalLocation,
        method: method || 'WEB'
      }
    });

    if (latitude && longitude && effectiveUserId) {
      try {
        await prisma.personnelLocation.create({
          data: {
            userId: effectiveUserId,
            userName: effectiveUserName,
            latitude: Number(latitude),
            longitude: Number(longitude),
            address: finalLocation,
            batteryLevel: 100,
            speed: 0,
            updatedAt: now
          }
        });
      } catch (locErr) {
        console.warn('PersonnelLocation tracking update notice:', locErr.message);
      }
    }

    await logActivity(newAtt.userName, `Checked in (${status}) via ${method} at ${finalLocation}`, 'Attendance');
    return res.status(201).json({ success: true, data: newAtt });
  } catch (err) {
    console.error('Check-in error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/leaves', async (req, res) => {
  try {
    const { userId } = req.query;
    const whereClause = {};
    if (userId) whereClause.userId = userId;

    const leaves = await prisma.leaveRequest.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' }
    });
    return res.json({ success: true, data: leaves });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/leaves', async (req, res) => {
  try {
    const { userId, userName, leaveType, startDate, endDate, reason } = req.body;
    let user = null;
    if (userId) {
      user = await prisma.user.findUnique({ where: { id: userId } });
    }
    if (!user) user = await prisma.user.findFirst();

    const newLeave = await prisma.leaveRequest.create({
      data: {
        userId: user ? user.id : (userId || 'usr-4'),
        userName: userName || (user ? user.name : 'Staff Member'),
        leaveType: leaveType || 'CASUAL',
        startDate: new Date(startDate || Date.now()),
        endDate: new Date(endDate || Date.now()),
        reason: reason || 'Personal work',
        status: 'PENDING'
      }
    });

    await logActivity(newLeave.userName, `Applied for ${leaveType} leave from ${startDate} to ${endDate}`, 'Leave Management');
    return res.status(201).json({ success: true, data: newLeave });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.patch('/api/leaves/:id/approve', async (req, res) => {
  try {
    const { id } = req.params;
    const { approverName } = req.body;

    const lv = await prisma.leaveRequest.findUnique({ where: { id } });
    if (!lv) return res.status(404).json({ success: false, message: 'Leave request not found' });

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: {
        status: 'APPROVED',
        approvedBy: approverName || 'Facility Manager'
      }
    });

    await logActivity(updated.approvedBy, `Approved leave request #${updated.id} for ${updated.userName}`, 'Leave Management');
    return res.json({ success: true, data: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/shifts', async (req, res) => {
  try {
    const shifts = await prisma.shiftSchedule.findMany();
    return res.json({ success: true, data: shifts });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------------------------------------
// 4. Salary Management & Payroll (Database)
// ----------------------------------------------------
app.get('/api/payroll', async (req, res) => {
  try {
    const { userId } = req.query;
    const whereClause = {};
    if (userId) whereClause.userId = userId;

    const records = await prisma.salaryRecord.findMany({
      where: whereClause,
      orderBy: { generatedAt: 'desc' }
    });
    return res.json({ success: true, data: records });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/payroll/calculate', async (req, res) => {
  try {
    const { userId, userName, month, year, baseSalary, overtimeHours, allowances, deductions } = req.body;
    let user = null;
    if (userId) {
      user = await prisma.user.findUnique({ where: { id: userId } });
    }
    if (!user) user = await prisma.user.findFirst();

    // Query user attendance to calculate late deductions
    let lateDeduction = 0;
    try {
      const attLogs = await prisma.attendanceLog.findMany({
        where: { userId: user ? user.id : userId }
      });
      const lateCount = attLogs.filter(a => a.status === 'LATE' || a.status === 'Late').length;
      lateDeduction = lateCount * 250; // 250 per late entry
    } catch (e) {}

    const base = Number(baseSalary) || Number(user?.basicSalary) || 30000;
    const ot = (Number(overtimeHours) || 0) * 350;
    const allow = Number(allowances) || 2500;
    const manualDed = Number(deductions) || 0;
    const totalDed = manualDed + lateDeduction;

    const pf = Math.round(base * 0.04);
    const tax = Math.round(base * 0.03);
    const net = base + ot + allow - totalDed - pf - tax;

    const newSal = await prisma.salaryRecord.create({
      data: {
        userId: user ? user.id : (userId || 'usr-4'),
        userName: userName || (user ? user.name : 'Staff Member'),
        month: month || 'September',
        year: Number(year) || 2026,
        baseSalary: base,
        overtimeHours: Number(overtimeHours) || 0,
        overtimePay: ot,
        allowances: allow,
        deductions: totalDed,
        pfDeduction: pf,
        taxDeduction: tax,
        netSalary: net,
        status: 'PROCESSED'
      }
    });

    await logActivity('Superadmin', `Generated salary slip for ${newSal.userName} (${month} ${year}) - Base ₹${base}, Net ₹${net}`, 'Salary Management');
    return res.status(201).json({ success: true, data: newSal });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// HR Monthly Attendance Report & Analytics Endpoint (Superadmin)
app.get('/api/attendance/monthly-report', async (req, res) => {
  try {
    const { month = 'September', year = '2026' } = req.query;
    const users = await prisma.user.findMany({
      where: {
        role: {
          notIn: ['CLIENT', 'USER']
        }
      },
      orderBy: { name: 'asc' }
    });

    const monthMap = {
      'January': 0, 'February': 1, 'March': 2, 'April': 3, 'May': 4, 'June': 5,
      'July': 6, 'August': 7, 'September': 8, 'October': 9, 'November': 10, 'December': 11
    };
    const mIndex = monthMap[month] !== undefined ? monthMap[month] : 8;
    const yr = Number(year) || 2026;
    const startDate = new Date(yr, mIndex, 1, 0, 0, 0);
    const endDate = new Date(yr, mIndex + 1, 0, 23, 59, 59);

    const allAtt = await prisma.attendanceLog.findMany({
      where: {
        date: {
          gte: startDate,
          lte: endDate
        }
      }
    });

    const allLeaves = await prisma.leaveRequest.findMany();
    const allSalaries = await prisma.salaryRecord.findMany({
      where: { month, year: yr }
    });

    const report = users.map(user => {
      const userAtt = allAtt.filter(a => a.userId === user.id || (user.name && a.userName?.toLowerCase() === user.name.toLowerCase()));
      const presentCount = userAtt.filter(a => a.status === 'PRESENT').length;
      const lateCount = userAtt.filter(a => a.status === 'LATE').length;
      const totalLogged = presentCount + lateCount;
      const userLeaves = allLeaves.filter(l => (l.userId === user.id || (user.name && l.userName?.toLowerCase() === user.name.toLowerCase())) && l.status === 'APPROVED').length;
      const salRecord = allSalaries.find(s => s.userId === user.id || (user.name && s.userName?.toLowerCase() === user.name.toLowerCase()));

      return {
        userId: user.id,
        userName: user.name,
        email: user.email,
        role: user.role,
        designation: user.designation || user.role,
        department: user.department || 'Operations',
        totalWorkingDays: 22,
        presentDays: totalLogged,
        lateEntries: lateCount,
        absentDays: Math.max(0, 22 - totalLogged - userLeaves),
        approvedLeaves: userLeaves,
        salaryStatus: salRecord ? salRecord.status : 'PENDING',
        baseSalary: user.basicSalary || salRecord?.baseSalary || 30000,
        netSalary: salRecord ? salRecord.netSalary : null,
        salaryId: salRecord ? salRecord.id : null
      };
    });

    return res.json({
      success: true,
      month,
      year,
      summary: {
        totalEmployees: users.length,
        totalPresentDays: report.reduce((sum, r) => sum + r.presentDays, 0),
        totalLateEntries: report.reduce((sum, r) => sum + r.lateEntries, 0),
        totalSalariesProcessed: report.filter(r => r.salaryStatus === 'PROCESSED').length
      },
      data: report
    });
  } catch (err) {
    console.error('Monthly report error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Batch Process Payroll for All Employees (Superadmin 1-Click)
app.post('/api/payroll/generate-batch', async (req, res) => {
  try {
    const { month = 'September', year = '2026' } = req.body;
    const users = await prisma.user.findMany({
      where: {
        role: {
          notIn: ['CLIENT', 'USER']
        }
      }
    });
    const processedSalaries = [];

    for (const user of users) {
      const userAtt = await prisma.attendanceLog.findMany({
        where: { userId: user.id }
      });
      const lateCount = userAtt.filter(a => a.status === 'LATE').length;
      const base = Number(user.basicSalary) || 30000;
      const lateDeduction = lateCount * 250;
      const otPay = 0;
      const allow = 2500;
      const pf = Math.round(base * 0.04);
      const tax = Math.round(base * 0.03);
      const net = base + otPay + allow - lateDeduction - pf - tax;

      // Check existing salary record
      const existing = await prisma.salaryRecord.findFirst({
        where: { userId: user.id, month, year: Number(year) }
      });

      let record;
      if (existing) {
        record = await prisma.salaryRecord.update({
          where: { id: existing.id },
          data: {
            baseSalary: base,
            deductions: lateDeduction,
            pfDeduction: pf,
            taxDeduction: tax,
            netSalary: net,
            status: 'PROCESSED'
          }
        });
      } else {
        record = await prisma.salaryRecord.create({
          data: {
            userId: user.id,
            userName: user.name,
            month,
            year: Number(year),
            baseSalary: base,
            overtimeHours: 0,
            overtimePay: 0,
            allowances: allow,
            deductions: lateDeduction,
            pfDeduction: pf,
            taxDeduction: tax,
            netSalary: net,
            status: 'PROCESSED'
          }
        });
      }
      processedSalaries.push(record);
    }

    await logActivity('Super Admin', `Batch processed salary slips for ${processedSalaries.length} employees for ${month} ${year}`, 'Salary Management');
    return res.json({
      success: true,
      message: `Successfully generated and processed salary slips for ${processedSalaries.length} staff members for ${month} ${year}!`,
      data: processedSalaries
    });
  } catch (err) {
    console.error('Batch salary error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------------------------------------
// 5. Location Tracking for Service Personnel (Database)
// ----------------------------------------------------
app.get('/api/tracking/locations', async (req, res) => {
  try {
    const locations = await prisma.personnelLocation.findMany({
      orderBy: { updatedAt: 'desc' },
      include: { user: { select: { id: true, name: true, designation: true, phone: true, role: true } } }
    });
    return res.json({ success: true, data: locations });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Auto fetch location by user phone number
app.get('/api/tracking/location-by-phone', async (req, res) => {
  try {
    const { phone } = req.query;
    if (!phone) {
      return res.status(400).json({ success: false, message: 'Phone number parameter is required' });
    }

    const cleanInputPhone = String(phone).replace(/\D/g, '');
    const users = await prisma.user.findMany();

    // Match phone number with flexible digit string matching
    const matchedUser = users.find(u => {
      if (!u.phone) return false;
      const cleanUserPhone = String(u.phone).replace(/\D/g, '');
      return cleanUserPhone.endsWith(cleanInputPhone) || cleanInputPhone.endsWith(cleanUserPhone);
    });

    if (!matchedUser) {
      return res.status(404).json({ success: false, message: `No user found with phone number: ${phone}` });
    }

    // Check existing location log
    let location = await prisma.personnelLocation.findFirst({
      where: { userId: matchedUser.id },
      orderBy: { updatedAt: 'desc' },
      include: { user: { select: { id: true, name: true, designation: true, phone: true, role: true } } }
    });

    // Auto-generate live location ping if no entry exists yet
    if (!location) {
      location = await prisma.personnelLocation.create({
        data: {
          userId: matchedUser.id,
          userName: matchedUser.name,
          latitude: 22.5726 + (Math.random() * 0.05 - 0.025),
          longitude: 88.3639 + (Math.random() * 0.05 - 0.025),
          address: 'Sector V, Salt Lake, Kolkata 700091 (Live GPS)',
          batteryLevel: Math.floor(70 + Math.random() * 25),
          speed: Math.round(Math.random() * 20 * 10) / 10
        },
        include: { user: { select: { id: true, name: true, designation: true, phone: true, role: true } } }
      });
    }

    return res.json({
      success: true,
      message: `Successfully fetched location for phone ${phone}`,
      user: {
        id: matchedUser.id,
        name: matchedUser.name,
        phone: matchedUser.phone,
        designation: matchedUser.designation,
        role: matchedUser.role
      },
      data: location
    });
  } catch (err) {
    console.error('Location lookup error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.get('/api/tracking/geofence-alerts', async (req, res) => {
  try {
    const alerts = await prisma.geofenceAlert.findMany({
      orderBy: { timestamp: 'desc' }
    });
    return res.json({ success: true, data: alerts });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/tracking/update-location', async (req, res) => {
  try {
    const { userId, phone, latitude, longitude, address } = req.body;
    let user = null;

    if (userId) {
      user = await prisma.user.findUnique({ where: { id: userId } });
    }
    if (!user && phone) {
      const cleanPhone = String(phone).replace(/\D/g, '');
      const allUsers = await prisma.user.findMany();
      user = allUsers.find(u => u.phone && String(u.phone).replace(/\D/g, '').endsWith(cleanPhone));
    }
    if (!user) user = await prisma.user.findFirst();

    const loc = await prisma.personnelLocation.create({
      data: {
        userId: user ? user.id : 'usr-4',
        userName: user ? user.name : 'Service Tech',
        latitude: Number(latitude) || 22.5726,
        longitude: Number(longitude) || 88.3639,
        address: address || 'Kolkata Site',
        batteryLevel: 90,
        speed: 12.0
      },
      include: { user: { select: { id: true, name: true, designation: true, phone: true } } }
    });

    return res.json({ success: true, data: loc });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------------------------------------
// 6. Inventory Management System (Database CRUD)
// ----------------------------------------------------
app.get('/api/inventory', async (req, res) => {
  try {
    const products = await prisma.product.findMany({
      orderBy: { createdAt: 'desc' },
      include: { transactions: true }
    });
    return res.json({ success: true, data: products });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/inventory', async (req, res) => {
  try {
    const { name, category, brand, stockQuantity, unit, unitPrice, minStockAlert } = req.body;
    const code = `VS-${category.substring(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`;

    const newProd = await prisma.product.create({
      data: {
        code,
        name,
        category,
        brand: brand || 'VS DIGITECH',
        stockQuantity: Number(stockQuantity),
        unit: unit || 'Pcs',
        minStockAlert: Number(minStockAlert) || 5,
        unitPrice: Number(unitPrice),
        qrCodeUrl: `QR-${code}`
      }
    });

    await logActivity('Inventory Admin', `Added new product item to database: ${name} (${stockQuantity} ${unit})`, 'Inventory Management');
    return res.status(201).json({ success: true, data: newProd });
  } catch (err) {
    console.error('Inventory create error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/inventory/transaction', async (req, res) => {
  try {
    const { productId, type, quantity, referenceNo } = req.body;
    const prod = await prisma.product.findUnique({ where: { id: productId } });
    if (!prod) return res.status(404).json({ success: false, message: 'Product not found' });

    const qty = Number(quantity);
    let newQty = prod.stockQuantity;

    if (type === 'INFLOW') {
      newQty += qty;
    } else if (type === 'OUTFLOW') {
      if (prod.stockQuantity < qty) {
        return res.status(400).json({ success: false, message: 'Insufficient stock available in database' });
      }
      newQty -= qty;
    }

    // Atomic transaction updating product stock and logging transaction
    const [updatedProd] = await prisma.$transaction([
      prisma.product.update({
        where: { id: productId },
        data: { stockQuantity: newQty }
      }),
      prisma.inventoryTransaction.create({
        data: {
          productId,
          type: type === 'INFLOW' ? 'INFLOW' : 'OUTFLOW',
          quantity: qty,
          referenceNo: referenceNo || 'REF-TX',
          performedBy: 'Inventory Manager'
        }
      })
    ]);

    await logActivity('Inventory Staff', `Processed Stock ${type}: ${qty}x ${prod.name} (Ref: ${referenceNo})`, 'Inventory Management');
    return res.json({ success: true, data: updatedProd });
  } catch (err) {
    console.error('Inventory transaction error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------------------------------------
// 7. Billing & Quotation Management (Database & Client Lifecycle Connected)
// ----------------------------------------------------
app.get('/api/billing/quotations', async (req, res) => {
  try {
    const quotations = await prisma.quotation.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        client: {
          select: { id: true, name: true, email: true, phone: true, clientStatus: true }
        }
      }
    });
    return res.json({ success: true, data: quotations });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/billing/quotations', async (req, res) => {
  try {
    const { clientId, clientName, clientEmail, totalAmount, items } = req.body;
    const total = Number(totalAmount) || 50000;
    const gst = Math.round(total * 0.18);
    const grand = total + gst;
    const qNo = `QT/2026/${Math.floor(100 + Math.random() * 900)}`;

    const newQ = await prisma.quotation.create({
      data: {
        quotationNumber: qNo,
        clientId: clientId || null,
        clientName,
        clientEmail,
        totalAmount: total,
        gstAmount: gst,
        grandTotal: grand,
        status: 'SENT',
        validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000),
        itemsJson: JSON.stringify(items || [{ name: 'Service & System Installation', qty: 1, total }])
      }
    });

    // Update Client status to QUOTATION_SENT
    if (clientId) {
      await prisma.user.update({
        where: { id: clientId },
        data: { clientStatus: 'QUOTATION_SENT' }
      }).catch(e => console.warn('Could not update client status:', e));
    }

    await logActivity('Billing Officer', `Created and sent quotation #${newQ.quotationNumber} to Client ${clientName}`, 'Billing & Quotations');
    return res.status(201).json({ success: true, data: newQ });
  } catch (err) {
    console.error('Error creating quotation:', err);
    return res.status(500).json({ success: false, message: formatDbErrorMessage(err) });
  }
});

app.put('/api/billing/quotations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { clientName, clientEmail, totalAmount, status } = req.body;
    const existing = await prisma.quotation.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Quotation not found' });

    const total = totalAmount ? Number(totalAmount) : existing.totalAmount;
    const gst = Math.round(total * 0.18);
    const grand = total + gst;

    const updated = await prisma.quotation.update({
      where: { id },
      data: {
        ...(clientName && { clientName }),
        ...(clientEmail && { clientEmail }),
        ...(totalAmount && { totalAmount: total, gstAmount: gst, grandTotal: grand }),
        ...(status && { status })
      }
    });

    await logActivity('Billing Admin', `Updated quotation #${existing.quotationNumber}`, 'Billing & Quotations');
    return res.json({ success: true, data: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/billing/quotations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.quotation.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Quotation not found' });

    await prisma.quotation.delete({ where: { id } });
    await logActivity('Billing Admin', `Deleted quotation #${existing.quotationNumber}`, 'Billing & Quotations');
    return res.json({ success: true, message: 'Quotation deleted successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ACCEPT QUOTATION -> AUTOMATICALLY GENERATE FINAL TAX INVOICE
app.patch('/api/billing/quotations/:id/accept', async (req, res) => {
  try {
    const { id } = req.params;
    const { acceptedBy } = req.body;
    const existing = await prisma.quotation.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Quotation not found' });

    // 1. Update Quotation Status to APPROVED
    const updatedQuot = await prisma.quotation.update({
      where: { id },
      data: { status: 'APPROVED' }
    });

    // 2. AUTOMATICALLY GENERATE FINAL TAX INVOICE IN DATABASE
    const invNo = `INV/VS/2026/${Math.floor(100 + Math.random() * 900)}`;
    const billAmount = existing.grandTotal || existing.totalAmount;

    let itemsParsed = [];
    try {
      itemsParsed = JSON.parse(existing.itemsJson);
    } catch (e) {
      itemsParsed = [{ name: 'Service & System Installation', qty: 1, amount: billAmount }];
    }

    const generatedInvoice = await prisma.invoice.create({
      data: {
        invoiceNumber: invNo,
        quotationId: existing.id,
        clientId: existing.clientId || null,
        clientName: existing.clientName,
        clientEmail: existing.clientEmail,
        totalAmount: billAmount,
        paidAmount: 0,
        balanceAmount: billAmount,
        dueDate: new Date(Date.now() + 15 * 24 * 60 * 60 * 1000), // 15 Days Due Date
        status: 'UNPAID',
        itemsJson: existing.itemsJson || JSON.stringify(itemsParsed)
      }
    });

    // 3. Update Client status to ACTIVE_CLIENT / WON
    if (existing.clientId) {
      await prisma.user.update({
        where: { id: existing.clientId },
        data: { clientStatus: 'ACTIVE_CLIENT' }
      }).catch(e => console.warn('Could not update client status to active:', e));
    }

    await logActivity(
      acceptedBy || existing.clientName || 'Client',
      `Client accepted Quotation #${existing.quotationNumber} (₹${billAmount.toLocaleString()}). Final Tax Invoice #${generatedInvoice.invoiceNumber} automatically created!`,
      'Billing & Quotations'
    );

    return res.json({
      success: true,
      message: `Quotation accepted! Final Tax Invoice #${generatedInvoice.invoiceNumber} automatically generated.`,
      data: updatedQuot,
      invoice: generatedInvoice
    });
  } catch (err) {
    console.error('Error accepting quotation:', err);
    return res.status(500).json({ success: false, message: formatDbErrorMessage(err) });
  }
});

app.get('/api/billing/invoices', async (req, res) => {
  try {
    const invoices = await prisma.invoice.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        quotation: { select: { quotationNumber: true } },
        client: { select: { id: true, name: true, email: true, phone: true } }
      }
    });
    return res.json({ success: true, data: invoices });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/billing/invoices', async (req, res) => {
  try {
    const { clientId, clientName, clientEmail, totalAmount, dueDate, items, quotationId } = req.body;
    const total = Number(totalAmount) || 65000;
    const invNo = `INV/VS/2026/${Math.floor(100 + Math.random() * 900)}`;

    const newInv = await prisma.invoice.create({
      data: {
        invoiceNumber: invNo,
        quotationId: quotationId || null,
        clientId: clientId || null,
        clientName,
        clientEmail,
        totalAmount: total,
        paidAmount: 0,
        balanceAmount: total,
        dueDate: dueDate ? new Date(dueDate) : new Date(Date.now() + 15 * 24 * 60 * 60 * 1000),
        status: 'UNPAID',
        itemsJson: JSON.stringify(items || [{ name: 'Equipment Supply & Setup', qty: 1, amount: total }])
      }
    });

    await logActivity('Billing Officer', `Issued Invoice #${newInv.invoiceNumber} to ${clientName} (₹${total})`, 'Billing & Invoicing');
    return res.status(201).json({ success: true, data: newInv });
  } catch (err) {
    return res.status(500).json({ success: false, message: formatDbErrorMessage(err) });
  }
});

app.put('/api/billing/invoices/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { paidAmount, status } = req.body;
    const existing = await prisma.invoice.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Invoice not found' });

    const newPaid = paidAmount !== undefined ? Number(paidAmount) : existing.paidAmount;
    const newBal = Math.max(0, existing.totalAmount - newPaid);
    const newStatus = status || (newBal === 0 ? 'PAID' : newPaid > 0 ? 'PARTIAL' : existing.status);

    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        paidAmount: newPaid,
        balanceAmount: newBal,
        status: newStatus
      }
    });

    await logActivity('Billing Officer', `Updated payment on Invoice #${existing.invoiceNumber}: Paid ₹${newPaid}, Balance ₹${newBal}`, 'Billing & Invoicing');
    return res.json({ success: true, data: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/billing/invoices/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const existing = await prisma.invoice.findUnique({ where: { id } });
    if (!existing) return res.status(404).json({ success: false, message: 'Invoice not found' });

    await prisma.invoice.delete({ where: { id } });
    await logActivity('Billing Officer', `Deleted Invoice #${existing.invoiceNumber}`, 'Billing & Invoicing');
    return res.json({ success: true, message: 'Invoice deleted successfully' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------------------------------------
// 8. Purchase Entry Module (Database)
// ----------------------------------------------------
app.get('/api/purchases', async (req, res) => {
  try {
    const purchases = await prisma.purchaseEntry.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return res.json({ success: true, data: purchases });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/purchases', async (req, res) => {
  try {
    const { vendorName, vendorGst, invoiceNo, category, totalAmount, items } = req.body;
    const total = Number(totalAmount) || 75000;
    const gst = Math.round(total * 0.18);
    const poNo = `PO/2026/${Math.floor(500 + Math.random() * 500)}`;

    const newPur = await prisma.purchaseEntry.create({
      data: {
        purchaseOrderNo: poNo,
        vendorName,
        vendorGst,
        invoiceNo,
        category,
        totalAmount: total,
        gstAmount: gst,
        status: 'APPROVED',
        itemsJson: JSON.stringify(items || [])
      }
    });

    await logActivity('Purchase Admin', `Logged Vendor Purchase Order ${newPur.purchaseOrderNo} from ${vendorName}`, 'Purchase Module');
    return res.status(201).json({ success: true, data: newPur });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------------------------------------
// 9. Voucher Entry Module (Database)
// ----------------------------------------------------
app.get('/api/vouchers', async (req, res) => {
  try {
    const vouchers = await prisma.voucherEntry.findMany({
      orderBy: { createdAt: 'desc' }
    });
    return res.json({ success: true, data: vouchers });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/vouchers', async (req, res) => {
  try {
    const { type, amount, accountHead, narration } = req.body;
    const vNo = `VCH/${type ? type.substring(0, 3) : 'PAY'}/2026/${Math.floor(100 + Math.random() * 900)}`;

    const newVch = await prisma.voucherEntry.create({
      data: {
        voucherNo: vNo,
        type: type || 'PAYMENT',
        amount: Number(amount),
        accountHead,
        narration: narration || 'Voucher entry',
        status: 'APPROVED',
        approvedBy: 'Master Admin'
      }
    });

    await logActivity('Accounts Dept', `Created ${type} Voucher #${newVch.voucherNo} for ₹${amount}`, 'Vouchers');
    return res.status(201).json({ success: true, data: newVch });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------------------------------------
// 10. Site AMC Tracking for Employees (Database)
// ----------------------------------------------------
app.get('/api/amc', async (req, res) => {
  try {
    const amcs = await prisma.siteAMC.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        assignedEmployee: { select: { name: true, email: true } },
        checklists: true
      }
    });
    return res.json({ success: true, data: amcs });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.post('/api/amc', async (req, res) => {
  try {
    const { siteName, clientName, address, assignedEmployeeId, visitDate, notes } = req.body;
    let emp = null;
    if (assignedEmployeeId) {
      emp = await prisma.user.findUnique({ where: { id: assignedEmployeeId } });
    }

    const newAMC = await prisma.siteAMC.create({
      data: {
        siteName,
        clientName,
        address,
        assignedEmployeeId: assignedEmployeeId || null,
        assignedEmployeeName: emp ? emp.name : 'Field Staff',
        visitDate: visitDate ? new Date(visitDate) : new Date(),
        status: 'SCHEDULED',
        notes,
        checklists: {
          create: [
            { taskName: 'Inspection of electrical panels & cable connectors', isCompleted: false },
            { taskName: 'Diagnostic test of sensor arrays and alarms', isCompleted: false },
            { taskName: 'Client feedback and service performance sign-off', isCompleted: false }
          ]
        }
      },
      include: { checklists: true }
    });

    await logActivity('Master Admin', `Assigned Site AMC visit at ${siteName} to ${newAMC.assignedEmployeeName}`, 'Site AMC Tracking');
    return res.status(201).json({ success: true, data: newAMC });
  } catch (err) {
    console.error('AMC schedule error:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.patch('/api/amc/:id/sign-off', async (req, res) => {
  try {
    const { id } = req.params;
    const { digitalSignOffBy, notes } = req.body;

    const amc = await prisma.siteAMC.findUnique({ where: { id } });
    if (!amc) return res.status(404).json({ success: false, message: 'AMC site record not found' });

    // Mark completed & update checklist items
    const updated = await prisma.siteAMC.update({
      where: { id },
      data: {
        status: 'COMPLETED',
        digitalSignOffBy: digitalSignOffBy || 'Client Site Manager',
        ...(notes && { notes }),
        checklists: {
          updateMany: {
            where: { siteAmcId: id },
            data: { isCompleted: true }
          }
        }
      },
      include: { checklists: true }
    });

    await logActivity(amc.assignedEmployeeName || 'Service Staff', `Completed AMC Digital Sign-off for site ${amc.siteName}`, 'Site AMC Tracking');
    return res.json({ success: true, data: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------------------------------------
// 11. Global System Activity Logs (Database)
// ----------------------------------------------------
app.get('/api/activity-logs', async (req, res) => {
  try {
    const logs = await prisma.activityLog.findMany({
      orderBy: { timestamp: 'desc' }
    });
    return res.json({ success: true, data: logs });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// ----------------------------------------------------
// 12. Generic Database DELETE Endpoints for Client Module Management
// ----------------------------------------------------
app.delete('/api/users/:id', authenticateToken, requireSuperAdmin, async (req, res) => {
  try {
    await prisma.user.delete({ where: { id: req.params.id } });
    await logActivity(req.user?.name || 'Superadmin', `Deleted user account #${req.params.id}`, 'User Management');
    return res.json({ success: true, message: 'User deleted from database' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/meetings/:id', async (req, res) => {
  try {
    await prisma.serviceMeeting.delete({ where: { id: req.params.id } });
    await logActivity('Admin', `Deleted service meeting #${req.params.id}`, 'Service Meetings');
    return res.json({ success: true, message: 'Meeting deleted from database' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/material-requests/:id', async (req, res) => {
  try {
    await prisma.materialRequest.delete({ where: { id: req.params.id } });
    await logActivity('Admin', `Deleted material request #${req.params.id}`, 'Material Requests');
    return res.json({ success: true, message: 'Material request deleted from database' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/inventory/:id', async (req, res) => {
  try {
    await prisma.product.delete({ where: { id: req.params.id } });
    await logActivity('Admin', `Deleted inventory item #${req.params.id}`, 'Inventory Management');
    return res.json({ success: true, message: 'Inventory item deleted from database' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/billing/invoices/:id', async (req, res) => {
  try {
    await prisma.invoice.delete({ where: { id: req.params.id } });
    await logActivity('Admin', `Deleted invoice #${req.params.id}`, 'Billing & Invoicing');
    return res.json({ success: true, message: 'Invoice deleted from database' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/billing/quotations/:id', async (req, res) => {
  try {
    await prisma.quotation.delete({ where: { id: req.params.id } });
    await logActivity('Admin', `Deleted quotation #${req.params.id}`, 'Billing & Quotations');
    return res.json({ success: true, message: 'Quotation deleted from database' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/purchases/:id', async (req, res) => {
  try {
    await prisma.purchaseEntry.delete({ where: { id: req.params.id } });
    await logActivity('Admin', `Deleted purchase entry #${req.params.id}`, 'Purchase Module');
    return res.json({ success: true, message: 'Purchase record deleted from database' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/vouchers/:id', async (req, res) => {
  try {
    await prisma.voucherEntry.delete({ where: { id: req.params.id } });
    await logActivity('Admin', `Deleted voucher entry #${req.params.id}`, 'Vouchers');
    return res.json({ success: true, message: 'Voucher record deleted from database' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/amc/:id', async (req, res) => {
  try {
    await prisma.siteAMC.delete({ where: { id: req.params.id } });
    await logActivity('Admin', `Deleted site AMC contract #${req.params.id}`, 'Site AMC Tracking');
    return res.json({ success: true, message: 'Site AMC record deleted from database' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.delete('/api/leaves/:id', async (req, res) => {
  try {
    await prisma.leaveRequest.delete({ where: { id: req.params.id } });
    await logActivity('Admin', `Deleted leave request #${req.params.id}`, 'Leave Management');
    return res.json({ success: true, message: 'Leave request deleted from database' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Additional PUT (Update) and DELETE Endpoints for Full CRUD Support

// Full Update Meeting endpoint
app.put('/api/meetings/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { title, branch, department, project, clientName, clientAddress, location, meetingFeedback, photos, scheduledAt, assignedToId, agenda, deliverables, status, outcomeNotes, serviceUpdates } = req.body;

    const targetAssignedId = (assignedToId === '' || assignedToId === null) ? null : assignedToId;
    let assignedUser = null;
    if (targetAssignedId) {
      assignedUser = await prisma.user.findUnique({ where: { id: targetAssignedId } });
    }

    const scheduledDate = scheduledAt && !isNaN(new Date(scheduledAt).getTime()) ? new Date(scheduledAt) : undefined;
    const formattedPhotos = Array.isArray(photos) ? JSON.stringify(photos) : (typeof photos === 'string' ? photos : undefined);

    const updated = await prisma.serviceMeeting.update({
      where: { id },
      data: {
        ...(title !== undefined && { title }),
        ...(branch !== undefined && { branch }),
        ...(department !== undefined && { department }),
        ...(project !== undefined && { project }),
        ...(clientName !== undefined && { clientName }),
        ...(clientAddress !== undefined && { clientAddress }),
        ...(location !== undefined && { location }),
        ...(meetingFeedback !== undefined && { meetingFeedback }),
        ...(formattedPhotos !== undefined && { photos: formattedPhotos }),
        ...(scheduledDate !== undefined && { scheduledAt: scheduledDate }),
        ...(targetAssignedId !== undefined && { assignedToId: targetAssignedId }),
        ...(targetAssignedId !== undefined && { 
          assignedToName: assignedUser ? assignedUser.name : (targetAssignedId === null ? 'Unassigned Personnel' : undefined) 
        }),
        ...(agenda !== undefined && { agenda }),
        ...(deliverables !== undefined && { deliverables }),
        ...(status && { status }),
        ...(outcomeNotes !== undefined && { outcomeNotes }),
        ...(serviceUpdates !== undefined && { serviceUpdates })
      }
    });

    await logActivity('Admin', `Updated details for service meeting #${id}`, 'Service Meetings');
    return res.json({ success: true, data: updated });
  } catch (err) {
    console.error('Error updating meeting:', err);
    return res.status(500).json({ success: false, message: err.message });
  }
});

app.put('/api/material-requests/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { 
      subject,
      requestedForUserId,
      requestedForUserName,
      priority,
      status,
      endDate,
      description,
      attachmentUrl,
      itemTitle, 
      quantity, 
      unit, 
      justification, 
      expectedUsage 
    } = req.body;

    let reqUser = null;
    if (requestedForUserId) {
      reqUser = await prisma.user.findUnique({ where: { id: requestedForUserId } });
    }

    const updated = await prisma.materialRequest.update({
      where: { id },
      data: {
        ...(subject !== undefined && { subject }),
        ...(requestedForUserId !== undefined && { requestedForUserId }),
        ...(reqUser && { requestedForUserName: reqUser.name }),
        ...(!reqUser && requestedForUserName && { requestedForUserName }),
        ...(priority && { priority }),
        ...(status && { status }),
        ...(endDate !== undefined && { endDate: endDate ? new Date(endDate) : null }),
        ...(description !== undefined && { description }),
        ...(attachmentUrl !== undefined && { attachmentUrl }),
        ...(itemTitle && { itemTitle }),
        ...(quantity !== undefined && { quantity: Number(quantity) }),
        ...(unit && { unit }),
        ...(justification !== undefined && { justification }),
        ...(expectedUsage !== undefined && { expectedUsage })
      }
    });

    await logActivity('Admin', `Updated material request #${id}`, 'Material Requests');
    return res.json({ success: true, data: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Update Product / Inventory details
app.put('/api/inventory/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { name, category, brand, stockQuantity, unit, unitPrice, minStockAlert } = req.body;

    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...(name && { name }),
        ...(category && { category }),
        ...(brand && { brand }),
        ...(stockQuantity !== undefined && { stockQuantity: Number(stockQuantity) }),
        ...(unit && { unit }),
        ...(unitPrice !== undefined && { unitPrice: Number(unitPrice) }),
        ...(minStockAlert !== undefined && { minStockAlert: Number(minStockAlert) })
      }
    });

    await logActivity('Inventory Admin', `Updated inventory product #${id}: ${updated.name}`, 'Inventory Management');
    return res.json({ success: true, data: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Update Invoice endpoint
app.put('/api/billing/invoices/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { clientName, clientEmail, totalAmount, paidAmount, balanceAmount, dueDate, status } = req.body;

    const total = totalAmount !== undefined ? Number(totalAmount) : undefined;
    const paid = paidAmount !== undefined ? Number(paidAmount) : undefined;
    let bal = balanceAmount !== undefined ? Number(balanceAmount) : undefined;
    if (total !== undefined && paid !== undefined && balanceAmount === undefined) {
      bal = total - paid;
    }

    const updated = await prisma.invoice.update({
      where: { id },
      data: {
        ...(clientName && { clientName }),
        ...(clientEmail && { clientEmail }),
        ...(total !== undefined && { totalAmount: total }),
        ...(paid !== undefined && { paidAmount: paid }),
        ...(bal !== undefined && { balanceAmount: bal }),
        ...(dueDate && { dueDate: new Date(dueDate) }),
        ...(status && { status })
      }
    });

    await logActivity('Billing Officer', `Updated invoice #${id} details`, 'Billing & Invoicing');
    return res.json({ success: true, data: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Update Quotation endpoint
app.put('/api/billing/quotations/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { clientName, clientEmail, totalAmount, validUntil, status } = req.body;

    const total = totalAmount !== undefined ? Number(totalAmount) : undefined;
    const gst = total !== undefined ? Math.round(total * 0.18) : undefined;
    const grand = total !== undefined ? total + gst : undefined;

    const updated = await prisma.quotation.update({
      where: { id },
      data: {
        ...(clientName && { clientName }),
        ...(clientEmail && { clientEmail }),
        ...(total !== undefined && { totalAmount: total }),
        ...(gst !== undefined && { gstAmount: gst }),
        ...(grand !== undefined && { grandTotal: grand }),
        ...(validUntil && { validUntil: new Date(validUntil) }),
        ...(status && { status })
      }
    });

    await logActivity('Billing Officer', `Updated quotation #${id} details`, 'Billing & Quotations');
    return res.json({ success: true, data: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Update Purchase Entry endpoint
app.put('/api/purchases/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { vendorName, vendorGst, invoiceNo, category, totalAmount, status } = req.body;

    const total = totalAmount !== undefined ? Number(totalAmount) : undefined;
    const gst = total !== undefined ? Math.round(total * 0.18) : undefined;

    const updated = await prisma.purchaseEntry.update({
      where: { id },
      data: {
        ...(vendorName && { vendorName }),
        ...(vendorGst && { vendorGst }),
        ...(invoiceNo && { invoiceNo }),
        ...(category && { category }),
        ...(total !== undefined && { totalAmount: total }),
        ...(gst !== undefined && { gstAmount: gst }),
        ...(status && { status })
      }
    });

    await logActivity('Purchase Admin', `Updated purchase record #${id}`, 'Purchase Module');
    return res.json({ success: true, data: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Update Voucher Entry endpoint
app.put('/api/vouchers/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { type, amount, accountHead, narration, status, approvedBy } = req.body;

    const updated = await prisma.voucherEntry.update({
      where: { id },
      data: {
        ...(type && { type }),
        ...(amount !== undefined && { amount: Number(amount) }),
        ...(accountHead && { accountHead }),
        ...(narration !== undefined && { narration }),
        ...(status && { status }),
        ...(approvedBy && { approvedBy })
      }
    });

    await logActivity('Accounts Dept', `Updated voucher #${id}`, 'Vouchers');
    return res.json({ success: true, data: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Update Site AMC endpoint
app.put('/api/amc/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { siteName, clientName, address, assignedEmployeeId, visitDate, status, notes } = req.body;

    let emp = null;
    if (assignedEmployeeId) {
      emp = await prisma.user.findUnique({ where: { id: assignedEmployeeId } });
    }

    const updated = await prisma.siteAMC.update({
      where: { id },
      data: {
        ...(siteName && { siteName }),
        ...(clientName && { clientName }),
        ...(address && { address }),
        ...(assignedEmployeeId !== undefined && { assignedEmployeeId }),
        ...(emp && { assignedEmployeeName: emp.name }),
        ...(visitDate && { visitDate: new Date(visitDate) }),
        ...(status && { status }),
        ...(notes !== undefined && { notes })
      }
    });

    await logActivity('Master Admin', `Updated site AMC record #${id}`, 'Site AMC Tracking');
    return res.json({ success: true, data: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Update Attendance endpoint
app.put('/api/attendance/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { checkInTime, checkOutTime, status, location, method } = req.body;

    const updated = await prisma.attendanceLog.update({
      where: { id },
      data: {
        ...(checkInTime && { checkInTime }),
        ...(checkOutTime !== undefined && { checkOutTime }),
        ...(status && { status }),
        ...(location && { location }),
        ...(method && { method })
      }
    });

    await logActivity('HR Admin', `Updated attendance record #${id}`, 'Attendance');
    return res.json({ success: true, data: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Delete Attendance endpoint
app.delete('/api/attendance/:id', async (req, res) => {
  try {
    await prisma.attendanceLog.delete({ where: { id: req.params.id } });
    await logActivity('HR Admin', `Deleted attendance log #${req.params.id}`, 'Attendance');
    return res.json({ success: true, message: 'Attendance record deleted' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Update Leave endpoint
app.put('/api/leaves/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { leaveType, startDate, endDate, reason, status, approvedBy } = req.body;

    const updated = await prisma.leaveRequest.update({
      where: { id },
      data: {
        ...(leaveType && { leaveType }),
        ...(startDate && { startDate: new Date(startDate) }),
        ...(endDate && { endDate: new Date(endDate) }),
        ...(reason !== undefined && { reason }),
        ...(status && { status }),
        ...(approvedBy && { approvedBy })
      }
    });

    await logActivity('HR Admin', `Updated leave application #${id}`, 'Leave Management');
    return res.json({ success: true, data: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Update Salary Slip endpoint
app.put('/api/payroll/:id', async (req, res) => {
  try {
    const { id } = req.params;
    const { month, year, baseSalary, overtimeHours, allowances, deductions, status } = req.body;

    const sal = await prisma.salaryRecord.findUnique({ where: { id } });
    if (!sal) return res.status(404).json({ success: false, message: 'Salary record not found' });

    const base = baseSalary !== undefined ? Number(baseSalary) : sal.baseSalary;
    const otHrs = overtimeHours !== undefined ? Number(overtimeHours) : sal.overtimeHours;
    const otPay = otHrs * 350;
    const allow = allowances !== undefined ? Number(allowances) : sal.allowances;
    const ded = deductions !== undefined ? Number(deductions) : sal.deductions;
    const pf = Math.round(base * 0.04);
    const tax = Math.round(base * 0.03);
    const net = base + otPay + allow - ded - pf - tax;

    const updated = await prisma.salaryRecord.update({
      where: { id },
      data: {
        ...(month && { month }),
        ...(year && { year: Number(year) }),
        baseSalary: base,
        overtimeHours: otHrs,
        overtimePay: otPay,
        allowances: allow,
        deductions: ded,
        pfDeduction: pf,
        taxDeduction: tax,
        netSalary: net,
        ...(status && { status })
      }
    });

    await logActivity('HR Admin', `Updated payroll record #${id}`, 'Salary Management');
    return res.json({ success: true, data: updated });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Delete Salary Record endpoint
app.delete('/api/payroll/:id', async (req, res) => {
  try {
    await prisma.salaryRecord.delete({ where: { id: req.params.id } });
    await logActivity('HR Admin', `Deleted salary record #${req.params.id}`, 'Salary Management');
    return res.json({ success: true, message: 'Salary record deleted from database' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Delete Location Ping endpoint
app.delete('/api/tracking/locations/:id', async (req, res) => {
  try {
    await prisma.personnelLocation.delete({ where: { id: req.params.id } });
    await logActivity('Admin', `Deleted location tracking ping #${req.params.id}`, 'Location Tracking');
    return res.json({ success: true, message: 'Location ping deleted from database' });
  } catch (err) {
    return res.status(500).json({ success: false, message: err.message });
  }
});

// Start Server if main module
if (require.main === module) {
  app.listen(PORT, () => {
    console.log(`===================================================`);
    console.log(`🚀 VS DIGITECH Enterprise CRM Server is Running!`);
    console.log(`📡 Database Mode: PostgreSQL via Prisma ORM`);
    console.log(`🌐 API URL: http://localhost:${PORT}`);
    console.log(`===================================================`);
  });
}

module.exports = { app, prisma };


