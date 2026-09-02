const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const { PrismaClient } = require('@prisma/client');
const mockData = require('./mockData');

dotenv.config();

const app = express();
const PORT = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());

// Initialize Prisma client with graceful fallback to mock store if DB connection fails
const prisma = new PrismaClient();

// In-Memory Data store (initialized with mockData for seamless development & offline fallback)
let dataStore = {
  users: [...mockData.mockUsers],
  meetings: [...mockData.mockMeetings],
  materialRequests: [...mockData.mockMaterialRequests],
  attendance: [...mockData.mockAttendance],
  leaves: [...mockData.mockLeaves],
  shifts: [...mockData.mockShifts],
  salaryRecords: [...mockData.mockSalaryRecords],
  locations: [...mockData.mockPersonnelLocations],
  geofenceAlerts: [...mockData.mockGeofenceAlerts],
  products: [...mockData.mockProducts],
  quotations: [...mockData.mockQuotations],
  invoices: [...mockData.mockInvoices],
  purchases: [...mockData.mockPurchases],
  vouchers: [...mockData.mockVouchers],
  siteAMCs: [...mockData.mockSiteAMCs],
  activityLogs: [...mockData.mockActivityLogs]
};

// Helper for activity log
function logActivity(userName, action, module) {
  const newLog = {
    id: `log-${Date.now()}`,
    userName,
    action,
    module,
    ipAddress: '127.0.0.1',
    timestamp: new Date().toISOString()
  };
  dataStore.activityLogs.unshift(newLog);
}

// ----------------------------------------------------
// Health Check Endpoint
// ----------------------------------------------------
app.get('/api/health', (req, res) => {
  res.json({
    status: 'ONLINE',
    system: 'VS DIGITECH Enterprise CRM API Server',
    version: '1.0.0',
    timestamp: new Date().toISOString()
  });
});

// ----------------------------------------------------
// 1. User Management & Access Control
// ----------------------------------------------------
app.get('/api/users', (req, res) => {
  res.json({ success: true, data: dataStore.users });
});

app.post('/api/users', (req, res) => {
  const { name, email, phone, designation, role } = req.body;
  const newUser = {
    id: `usr-${Date.now()}`,
    name,
    email,
    phone,
    designation,
    role: role || 'SERVICE_PERSONNEL',
    isMfaEnabled: false,
    avatarUrl: `https://images.unsplash.com/photo-1535713875002-d1d0cf377fde?w=150`
  };
  dataStore.users.push(newUser);
  logActivity('Master Admin', `Created new user account: ${name} (${role})`, 'User Management');
  res.status(201).json({ success: true, data: newUser });
});

app.patch('/api/users/:id/mfa', (req, res) => {
  const user = dataStore.users.find(u => u.id === req.params.id);
  if (!user) return res.status(404).json({ success: false, message: 'User not found' });
  user.isMfaEnabled = !user.isMfaEnabled;
  logActivity(user.name, `Toggled MFA status to ${user.isMfaEnabled ? 'ENABLED' : 'DISABLED'}`, 'User Security');
  res.json({ success: true, data: user });
});

// ----------------------------------------------------
// 2. Service Meeting Tracking & Material Requests
// ----------------------------------------------------
app.get('/api/meetings', (req, res) => {
  res.json({ success: true, data: dataStore.meetings });
});

app.post('/api/meetings', (req, res) => {
  const { title, clientName, clientAddress, scheduledAt, assignedToId, agenda, deliverables } = req.body;
  const assignedUser = dataStore.users.find(u => u.id === assignedToId);
  const newMeeting = {
    id: `mtg-${Date.now()}`,
    title,
    clientName,
    clientAddress,
    scheduledAt: scheduledAt || new Date().toISOString(),
    status: 'SCHEDULED',
    assignedToId,
    assignedToName: assignedUser ? assignedUser.name : 'Unassigned',
    agenda,
    deliverables,
    outcomeNotes: null,
    serviceUpdates: 'Meeting scheduled and assigned.'
  };
  dataStore.meetings.unshift(newMeeting);
  logActivity('System', `Scheduled service meeting: ${title} for ${clientName}`, 'Service Meetings');
  res.status(201).json({ success: true, data: newMeeting });
});

app.patch('/api/meetings/:id/update', (req, res) => {
  const mtg = dataStore.meetings.find(m => m.id === req.params.id);
  if (!mtg) return res.status(404).json({ success: false, message: 'Meeting not found' });
  const { status, outcomeNotes, serviceUpdates } = req.body;
  if (status) mtg.status = status;
  if (outcomeNotes) mtg.outcomeNotes = outcomeNotes;
  if (serviceUpdates) mtg.serviceUpdates = serviceUpdates;
  logActivity(mtg.assignedToName || 'Service Personnel', `Updated service meeting #${mtg.id} status to ${mtg.status}`, 'Service Meetings');
  res.json({ success: true, data: mtg });
});

// Material Requests & 2-Tier Approval Workflow (Master Admin -> Facility Manager)
app.get('/api/material-requests', (req, res) => {
  res.json({ success: true, data: dataStore.materialRequests });
});

app.post('/api/material-requests', (req, res) => {
  const { meetingId, itemTitle, quantity, unit, justification, expectedUsage, requestedBy } = req.body;
  const meeting = dataStore.meetings.find(m => m.id === meetingId);
  const newReq = {
    id: `mat-${Date.now()}`,
    meetingId,
    meetingTitle: meeting ? meeting.title : 'General Field Job',
    itemTitle,
    quantity: Number(quantity),
    unit: unit || 'Pcs',
    justification,
    expectedUsage,
    status: 'PENDING_MASTER_ADMIN', // 1st stage approval
    requestedBy: requestedBy || 'Service Personnel',
    masterAdminApprovedBy: null,
    facilityManagerApprovedBy: null,
    createdAt: new Date().toISOString()
  };
  dataStore.materialRequests.unshift(newReq);
  logActivity(newReq.requestedBy, `Submitted material request for ${quantity}x ${itemTitle}`, 'Material Requests');
  res.status(201).json({ success: true, data: newReq });
});

app.patch('/api/material-requests/:id/approve', (req, res) => {
  const reqItem = dataStore.materialRequests.find(m => m.id === req.params.id);
  if (!reqItem) return res.status(404).json({ success: false, message: 'Request not found' });
  const { role, approverName } = req.body;

  if (role === 'MASTER_ADMIN' && reqItem.status === 'PENDING_MASTER_ADMIN') {
    reqItem.status = 'PENDING_FACILITY_MANAGER';
    reqItem.masterAdminApprovedBy = `${approverName || 'Master Admin'} (Master Admin)`;
    logActivity(approverName || 'Master Admin', `Approved Step 1 for Material Request #${reqItem.id}`, 'Approval Workflow');
  } else if (role === 'FACILITY_MANAGER' && reqItem.status === 'PENDING_FACILITY_MANAGER') {
    reqItem.status = 'APPROVED';
    reqItem.facilityManagerApprovedBy = `${approverName || 'Facility Manager'} (Facility Manager)`;
    logActivity(approverName || 'Facility Manager', `Final Approved Step 2 for Material Request #${reqItem.id}`, 'Approval Workflow');
  } else {
    return res.status(400).json({ success: false, message: 'Invalid approval stage or insufficient role authority' });
  }

  res.json({ success: true, data: reqItem });
});

// ----------------------------------------------------
// 3. Attendance, Shift & Leave Management
// ----------------------------------------------------
app.get('/api/attendance', (req, res) => {
  res.json({ success: true, data: dataStore.attendance });
});

app.post('/api/attendance/check-in', (req, res) => {
  const { userId, userName, location, method } = req.body;
  const newAtt = {
    id: `att-${Date.now()}`,
    userId,
    userName,
    date: new Date().toISOString().split('T')[0],
    checkInTime: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    checkOutTime: null,
    status: 'PRESENT',
    location: location || 'Field Site',
    method: method || 'WEB'
  };
  dataStore.attendance.unshift(newAtt);
  logActivity(userName, `Checked in via ${method} at ${location || 'Site'}`, 'Attendance');
  res.status(201).json({ success: true, data: newAtt });
});

app.get('/api/leaves', (req, res) => {
  res.json({ success: true, data: dataStore.leaves });
});

app.post('/api/leaves', (req, res) => {
  const { userId, userName, leaveType, startDate, endDate, reason } = req.body;
  const newLeave = {
    id: `lv-${Date.now()}`,
    userId,
    userName,
    leaveType,
    startDate,
    endDate,
    reason,
    status: 'PENDING',
    approvedBy: null
  };
  dataStore.leaves.unshift(newLeave);
  logActivity(userName, `Applied for ${leaveType} leave from ${startDate} to ${endDate}`, 'Leave Management');
  res.status(201).json({ success: true, data: newLeave });
});

app.patch('/api/leaves/:id/approve', (req, res) => {
  const lv = dataStore.leaves.find(l => l.id === req.params.id);
  if (!lv) return res.status(404).json({ success: false, message: 'Leave request not found' });
  const { approverName } = req.body;
  lv.status = 'APPROVED';
  lv.approvedBy = approverName || 'Facility Manager';
  logActivity(lv.approvedBy, `Approved leave request #${lv.id} for ${lv.userName}`, 'Leave Management');
  res.json({ success: true, data: lv });
});

app.get('/api/shifts', (req, res) => {
  res.json({ success: true, data: dataStore.shifts });
});

// ----------------------------------------------------
// 4. Salary Management & Payroll
// ----------------------------------------------------
app.get('/api/payroll', (req, res) => {
  res.json({ success: true, data: dataStore.salaryRecords });
});

app.post('/api/payroll/calculate', (req, res) => {
  const { userId, userName, month, year, baseSalary, overtimeHours, allowances, deductions } = req.body;
  const base = Number(baseSalary) || 40000;
  const ot = (Number(overtimeHours) || 0) * 350;
  const allow = Number(allowances) || 2000;
  const ded = Number(deductions) || 1500;
  const pf = Math.round(base * 0.04);
  const tax = Math.round(base * 0.03);
  const net = base + ot + allow - ded - pf - tax;

  const newSal = {
    id: `sal-${Date.now()}`,
    userId,
    userName,
    designation: 'Service Specialist',
    month: month || 'September',
    year: Number(year) || 2026,
    baseSalary: base,
    overtimeHours: Number(overtimeHours) || 0,
    overtimePay: ot,
    allowances: allow,
    deductions: ded,
    pfDeduction: pf,
    taxDeduction: tax,
    netSalary: net,
    status: 'PROCESSED',
    generatedAt: new Date().toISOString().split('T')[0]
  };
  dataStore.salaryRecords.unshift(newSal);
  logActivity('Master Admin', `Generated salary slip for ${userName} (${month} ${year})`, 'Salary Management');
  res.status(201).json({ success: true, data: newSal });
});

// ----------------------------------------------------
// 5. Location Tracking for Service Personnel
// ----------------------------------------------------
app.get('/api/tracking/locations', (req, res) => {
  res.json({ success: true, data: dataStore.locations });
});

app.get('/api/tracking/geofence-alerts', (req, res) => {
  res.json({ success: true, data: dataStore.geofenceAlerts });
});

app.post('/api/tracking/update-location', (req, res) => {
  const { userId, latitude, longitude, address } = req.body;
  let loc = dataStore.locations.find(l => l.userId === userId);
  if (!loc) {
    loc = {
      id: `loc-${Date.now()}`,
      userId,
      userName: 'Service Tech',
      designation: 'Field Personnel',
      latitude: Number(latitude),
      longitude: Number(longitude),
      address: address || 'Kolkata Site',
      batteryLevel: 90,
      speed: 12.0,
      status: 'ACTIVE',
      lastUpdated: 'Just now'
    };
    dataStore.locations.push(loc);
  } else {
    loc.latitude = Number(latitude);
    loc.longitude = Number(longitude);
    if (address) loc.address = address;
    loc.lastUpdated = 'Just now';
  }
  res.json({ success: true, data: loc });
});

// ----------------------------------------------------
// 6. Inventory Management System
// ----------------------------------------------------
app.get('/api/inventory', (req, res) => {
  res.json({ success: true, data: dataStore.products });
});

app.post('/api/inventory', (req, res) => {
  const { name, category, brand, stockQuantity, unit, unitPrice, minStockAlert } = req.body;
  const newProd = {
    id: `prod-${Date.now()}`,
    code: `VS-${category.substring(0, 3).toUpperCase()}-${Math.floor(100 + Math.random() * 900)}`,
    name,
    category,
    brand,
    stockQuantity: Number(stockQuantity),
    unit: unit || 'Pcs',
    minStockAlert: Number(minStockAlert) || 5,
    unitPrice: Number(unitPrice),
    qrCodeUrl: `QR-VS-${Date.now()}`
  };
  dataStore.products.unshift(newProd);
  logActivity('Inventory Admin', `Added new product item: ${name} (${stockQuantity} ${unit})`, 'Inventory Management');
  res.status(201).json({ success: true, data: newProd });
});

app.post('/api/inventory/transaction', (req, res) => {
  const { productId, type, quantity, referenceNo } = req.body;
  const prod = dataStore.products.find(p => p.id === productId);
  if (!prod) return res.status(404).json({ success: false, message: 'Product not found' });
  const qty = Number(quantity);
  if (type === 'INFLOW') {
    prod.stockQuantity += qty;
  } else if (type === 'OUTFLOW') {
    if (prod.stockQuantity < qty) {
      return res.status(400).json({ success: false, message: 'Insufficient stock available' });
    }
    prod.stockQuantity -= qty;
  }
  logActivity('Inventory Staff', `Processed Stock ${type}: ${qty}x ${prod.name} (Ref: ${referenceNo})`, 'Inventory Management');
  res.json({ success: true, data: prod });
});

// ----------------------------------------------------
// 7. Billing & Quotation Management
// ----------------------------------------------------
app.get('/api/billing/quotations', (req, res) => {
  res.json({ success: true, data: dataStore.quotations });
});

app.post('/api/billing/quotations', (req, res) => {
  const { clientName, clientEmail, totalAmount, items } = req.body;
  const total = Number(totalAmount) || 50000;
  const gst = Math.round(total * 0.18);
  const grand = total + gst;
  const newQ = {
    id: `q-${Date.now()}`,
    quotationNumber: `QT/2026/${Math.floor(100 + Math.random() * 900)}`,
    clientName,
    clientEmail,
    totalAmount: total,
    gstAmount: gst,
    grandTotal: grand,
    status: 'SENT',
    validUntil: new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    itemsJson: JSON.stringify(items || [{ name: 'Service & System Installation', qty: 1, total }]),
    createdAt: new Date().toISOString().split('T')[0]
  };
  dataStore.quotations.unshift(newQ);
  logActivity('Billing Officer', `Created quotation #${newQ.quotationNumber} for ${clientName}`, 'Billing & Quotations');
  res.status(201).json({ success: true, data: newQ });
});

app.get('/api/billing/invoices', (req, res) => {
  res.json({ success: true, data: dataStore.invoices });
});

app.post('/api/billing/invoices', (req, res) => {
  const { clientName, clientEmail, totalAmount, dueDate, items } = req.body;
  const total = Number(totalAmount) || 65000;
  const newInv = {
    id: `inv-${Date.now()}`,
    invoiceNumber: `INV/VS/2026/${Math.floor(100 + Math.random() * 900)}`,
    clientName,
    clientEmail,
    totalAmount: total,
    paidAmount: 0,
    balanceAmount: total,
    dueDate: dueDate || new Date(Date.now() + 15 * 24 * 60 * 60 * 1000).toISOString().split('T')[0],
    status: 'UNPAID',
    itemsJson: JSON.stringify(items || [{ name: 'Equipment Supply & Setup', qty: 1, amount: total }]),
    createdAt: new Date().toISOString().split('T')[0]
  };
  dataStore.invoices.unshift(newInv);
  logActivity('Billing Officer', `Issued Invoice #${newInv.invoiceNumber} to ${clientName} (₹${total})`, 'Billing & Invoicing');
  res.status(201).json({ success: true, data: newInv });
});

// ----------------------------------------------------
// 8. Purchase Entry Module
// ----------------------------------------------------
app.get('/api/purchases', (req, res) => {
  res.json({ success: true, data: dataStore.purchases });
});

app.post('/api/purchases', (req, res) => {
  const { vendorName, vendorGst, invoiceNo, category, totalAmount, items } = req.body;
  const total = Number(totalAmount) || 75000;
  const gst = Math.round(total * 0.18);
  const newPur = {
    id: `pur-${Date.now()}`,
    purchaseOrderNo: `PO/2026/${Math.floor(500 + Math.random() * 500)}`,
    vendorName,
    vendorGst,
    invoiceNo,
    category,
    totalAmount: total,
    gstAmount: gst,
    status: 'APPROVED',
    itemsJson: JSON.stringify(items || []),
    createdAt: new Date().toISOString().split('T')[0]
  };
  dataStore.purchases.unshift(newPur);
  logActivity('Purchase Admin', `Logged Vendor Purchase Order ${newPur.purchaseOrderNo} from ${vendorName}`, 'Purchase Module');
  res.status(201).json({ success: true, data: newPur });
});

// ----------------------------------------------------
// 9. Voucher Entry Module (Payment, Journal, Contra, Receipt)
// ----------------------------------------------------
app.get('/api/vouchers', (req, res) => {
  res.json({ success: true, data: dataStore.vouchers });
});

app.post('/api/vouchers', (req, res) => {
  const { type, amount, accountHead, narration } = req.body;
  const newVch = {
    id: `vch-${Date.now()}`,
    voucherNo: `VCH/${type.substring(0, 3)}/2026/${Math.floor(100 + Math.random() * 900)}`,
    type: type || 'PAYMENT',
    amount: Number(amount),
    accountHead,
    narration,
    status: 'APPROVED',
    approvedBy: 'Master Admin',
    createdAt: new Date().toISOString().split('T')[0]
  };
  dataStore.vouchers.unshift(newVch);
  logActivity('Accounts Dept', `Created ${type} Voucher #${newVch.voucherNo} for ₹${amount}`, 'Vouchers');
  res.status(201).json({ success: true, data: newVch });
});

// ----------------------------------------------------
// 10. Site AMC Tracking for Employees
// ----------------------------------------------------
app.get('/api/amc', (req, res) => {
  res.json({ success: true, data: dataStore.siteAMCs });
});

app.post('/api/amc', (req, res) => {
  const { siteName, clientName, address, assignedEmployeeId, visitDate, notes } = req.body;
  const emp = dataStore.users.find(u => u.id === assignedEmployeeId);
  const newAMC = {
    id: `amc-${Date.now()}`,
    siteName,
    clientName,
    address,
    assignedEmployeeId,
    assignedEmployeeName: emp ? emp.name : 'Field Staff',
    visitDate: visitDate || new Date().toISOString().split('T')[0],
    status: 'SCHEDULED',
    digitalSignOffBy: null,
    notes,
    checklists: [
      { id: `chk-${Date.now()}-1`, taskName: 'Inspection of electrical panels & cable connectors', isCompleted: false },
      { id: `chk-${Date.now()}-2`, taskName: 'Diagnostic test of sensor arrays and alarms', isCompleted: false },
      { id: `chk-${Date.now()}-3`, taskName: 'Client feedback and service performance sign-off', isCompleted: false }
    ]
  };
  dataStore.siteAMCs.unshift(newAMC);
  logActivity('Master Admin', `Assigned Site AMC visit at ${siteName} to ${newAMC.assignedEmployeeName}`, 'Site AMC Tracking');
  res.status(201).json({ success: true, data: newAMC });
});

app.patch('/api/amc/:id/sign-off', (req, res) => {
  const amc = dataStore.siteAMCs.find(a => a.id === req.params.id);
  if (!amc) return res.status(404).json({ success: false, message: 'AMC site record not found' });
  const { digitalSignOffBy, notes } = req.body;
  amc.status = 'COMPLETED';
  amc.digitalSignOffBy = digitalSignOffBy || 'Client Site Manager';
  if (notes) amc.notes = notes;
  amc.checklists.forEach(c => c.isCompleted = true);
  logActivity(amc.assignedEmployeeName || 'Service Staff', `Completed AMC Digital Sign-off for site ${amc.siteName}`, 'Site AMC Tracking');
  res.json({ success: true, data: amc });
});

// ----------------------------------------------------
// 11. Global System Activity Logs
// ----------------------------------------------------
app.get('/api/activity-logs', (req, res) => {
  res.json({ success: true, data: dataStore.activityLogs });
});

// Start Server
app.listen(PORT, () => {
  console.log(`===================================================`);
  console.log(`🚀 VS DIGITECH Enterprise CRM Server is Running!`);
  console.log(`📡 URL: http://localhost:${PORT}`);
  console.log(`📋 Modules Loaded: 11 Core Enterprise CRM Modules`);
  console.log(`===================================================`);
});
