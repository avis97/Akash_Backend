const { PrismaClient } = require('@prisma/client');
const prisma = new PrismaClient();
const mockData = require('../src/mockData');
const bcrypt = require('bcryptjs');

async function main() {
  console.log('🌱 Starting Full Akash CRM Database Seeding...');

  // 1. Users
  for (const u of mockData.mockUsers) {
    const hashedPassword = bcrypt.hashSync(u.password || 'password123', 10);
    await prisma.user.upsert({
      where: { email: u.email },
      update: {
        password: hashedPassword,
        role: u.role
      },
      create: {
        id: u.id,
        name: u.name,
        email: u.email,
        password: hashedPassword,
        phone: u.phone,
        designation: u.designation,
        role: u.role,
        isMfaEnabled: u.isMfaEnabled || false,
        avatarUrl: u.avatarUrl
      }
    });
  }
  console.log('✅ Users seeded into database');

  // 2. Products
  for (const p of mockData.mockProducts) {
    await prisma.product.upsert({
      where: { code: p.code },
      update: {},
      create: {
        id: p.id,
        code: p.code,
        name: p.name,
        category: p.category,
        brand: p.brand,
        stockQuantity: p.stockQuantity,
        unit: p.unit,
        minStockAlert: p.minStockAlert,
        unitPrice: p.unitPrice,
        qrCodeUrl: p.qrCodeUrl
      }
    });
  }
  console.log('✅ Products seeded into database');

  // 3. Service Meetings & Material Requests
  for (const m of mockData.mockMeetings) {
    await prisma.serviceMeeting.upsert({
      where: { id: m.id },
      update: {},
      create: {
        id: m.id,
        title: m.title || `Service Visit: ${m.clientName || m.client}`,
        clientName: m.clientName || m.client || 'Client Corp',
        clientAddress: m.clientAddress || 'Kolkata Site',
        scheduledAt: new Date(m.scheduledAt || Date.now()),
        status: m.status || 'SCHEDULED',
        assignedToId: m.assignedToId || null,
        assignedToName: m.assignedToName || m.assignee || 'Service Tech',
        agenda: m.agenda || 'Regular maintenance inspection',
        deliverables: m.deliverables || 'Service sign-off sheet',
        outcomeNotes: m.outcomeNotes || null,
        serviceUpdates: m.serviceUpdates || 'Meeting scheduled.'
      }
    });
  }
  console.log('✅ Service Meetings seeded into database');

  for (const mat of mockData.mockMaterialRequests) {
    await prisma.materialRequest.upsert({
      where: { id: mat.id },
      update: {},
      create: {
        id: mat.id,
        meetingId: mat.meetingId || 'mtg-1',
        itemTitle: mat.itemTitle || 'Default Material Item',
        quantity: Number(mat.quantity) || 1,
        unit: mat.unit || 'Pcs',
        justification: mat.justification || 'Field work requirement',
        expectedUsage: mat.expectedUsage || 'On site installation',
        status: mat.status || 'PENDING_MASTER_ADMIN',
        masterAdminApprovedBy: mat.masterAdminApprovedBy || null,
        facilityManagerApprovedBy: mat.facilityManagerApprovedBy || null
      }
    });
  }
  console.log('✅ Material Requests seeded into database');

  // 4. Attendance & Leaves
  for (const att of mockData.mockAttendance) {
    await prisma.attendanceLog.upsert({
      where: { id: att.id },
      update: {},
      create: {
        id: att.id,
        userId: att.userId || 'usr-4',
        userName: att.userName || 'Staff Member',
        date: new Date(att.date || Date.now()),
        checkInTime: att.checkInTime || '09:30 AM',
        checkOutTime: att.checkOutTime || null,
        status: att.status || 'PRESENT',
        location: att.location || 'Dumdum HQ',
        method: att.method || 'WEB'
      }
    });
  }
  console.log('✅ Attendance Logs seeded into database');

  for (const lv of mockData.mockLeaves) {
    await prisma.leaveRequest.upsert({
      where: { id: lv.id },
      update: {},
      create: {
        id: lv.id,
        userId: lv.userId || 'usr-4',
        userName: lv.userName || 'Staff Member',
        leaveType: lv.leaveType || 'CASUAL',
        startDate: new Date(lv.startDate || Date.now()),
        endDate: new Date(lv.endDate || Date.now()),
        reason: lv.reason || 'Personal work',
        status: lv.status || 'PENDING',
        approvedBy: lv.approvedBy || null
      }
    });
  }
  console.log('✅ Leave Requests seeded into database');

  // 5. Salary Records
  for (const sal of mockData.mockSalaryRecords) {
    await prisma.salaryRecord.upsert({
      where: { id: sal.id },
      update: {},
      create: {
        id: sal.id,
        userId: sal.userId || 'usr-4',
        userName: sal.userName || 'Staff Member',
        month: sal.month || 'September',
        year: Number(sal.year) || 2026,
        baseSalary: Number(sal.baseSalary) || 40000,
        overtimeHours: Number(sal.overtimeHours) || 0,
        overtimePay: Number(sal.overtimePay) || 0,
        allowances: Number(sal.allowances) || 0,
        deductions: Number(sal.deductions) || 0,
        netSalary: Number(sal.netSalary) || 40000,
        status: sal.status || 'PROCESSED',
        pfDeduction: Number(sal.pfDeduction) || 1600,
        taxDeduction: Number(sal.taxDeduction) || 1200,
        generatedAt: new Date(sal.generatedAt || Date.now())
      }
    });
  }
  console.log('✅ Salary Records seeded into database');

  // 6. Locations & Geofence Alerts
  for (const loc of mockData.mockPersonnelLocations) {
    await prisma.personnelLocation.upsert({
      where: { id: loc.id },
      update: {},
      create: {
        id: loc.id,
        userId: loc.userId || 'usr-4',
        userName: loc.userName || 'Service Tech',
        latitude: Number(loc.latitude) || 22.5726,
        longitude: Number(loc.longitude) || 88.3639,
        address: loc.address || 'Kolkata, West Bengal',
        batteryLevel: Number(loc.batteryLevel) || 90,
        speed: Number(loc.speed) || 10
      }
    });
  }
  console.log('✅ Personnel Locations seeded into database');

  for (const geo of mockData.mockGeofenceAlerts) {
    await prisma.geofenceAlert.upsert({
      where: { id: geo.id },
      update: {},
      create: {
        id: geo.id,
        userId: geo.userId || 'usr-4',
        userName: geo.userName || 'Service Tech',
        zoneName: geo.zoneName || 'Sector V Zone',
        alertType: geo.alertType || 'DEVIATION',
        message: geo.message || 'Route deviation detected',
        timestamp: new Date(geo.timestamp || Date.now())
      }
    });
  }
  console.log('✅ Geofence Alerts seeded into database');

  // 7. Quotations & Invoices
  for (const q of mockData.mockQuotations) {
    await prisma.quotation.upsert({
      where: { quotationNumber: q.quotationNumber },
      update: {},
      create: {
        id: q.id,
        quotationNumber: q.quotationNumber,
        clientName: q.clientName || 'Client Corp',
        clientEmail: q.clientEmail || 'client@corp.com',
        totalAmount: Number(q.totalAmount) || 50000,
        gstAmount: Number(q.gstAmount) || 9000,
        grandTotal: Number(q.grandTotal) || 59000,
        status: q.status || 'SENT',
        validUntil: new Date(q.validUntil || Date.now()),
        itemsJson: q.itemsJson || '[]'
      }
    });
  }
  console.log('✅ Quotations seeded into database');

  for (const inv of mockData.mockInvoices) {
    await prisma.invoice.upsert({
      where: { invoiceNumber: inv.invoiceNumber },
      update: {},
      create: {
        id: inv.id,
        invoiceNumber: inv.invoiceNumber,
        clientName: inv.clientName || 'Client Corp',
        clientEmail: inv.clientEmail || 'client@corp.com',
        totalAmount: Number(inv.totalAmount) || 65000,
        paidAmount: Number(inv.paidAmount) || 0,
        balanceAmount: Number(inv.balanceAmount) || 65000,
        dueDate: new Date(inv.dueDate || Date.now()),
        status: inv.status || 'UNPAID',
        itemsJson: inv.itemsJson || '[]'
      }
    });
  }
  console.log('✅ Invoices seeded into database');

  // 8. Purchases & Vouchers
  for (const pur of mockData.mockPurchases) {
    await prisma.purchaseEntry.upsert({
      where: { purchaseOrderNo: pur.purchaseOrderNo },
      update: {},
      create: {
        id: pur.id,
        purchaseOrderNo: pur.purchaseOrderNo,
        vendorName: pur.vendorName || 'Vendor Corp',
        vendorGst: pur.vendorGst || '19AABCC1234F1ZB',
        invoiceNo: pur.invoiceNo || 'INV-001',
        category: pur.category || 'Networking Equipment',
        totalAmount: Number(pur.totalAmount) || 75000,
        gstAmount: Number(pur.gstAmount) || 13500,
        status: pur.status || 'APPROVED',
        itemsJson: pur.itemsJson || '[]'
      }
    });
  }
  console.log('✅ Purchases seeded into database');

  for (const v of mockData.mockVouchers) {
    await prisma.voucherEntry.upsert({
      where: { voucherNo: v.voucherNo },
      update: {},
      create: {
        id: v.id,
        voucherNo: v.voucherNo,
        type: v.type || 'PAYMENT',
        amount: Number(v.amount) || 25000,
        accountHead: v.accountHead || 'Vendor Settlement',
        narration: v.narration || 'Payment voucher for stock',
        status: v.status || 'APPROVED',
        approvedBy: v.approvedBy || 'Master Admin'
      }
    });
  }
  console.log('✅ Vouchers seeded into database');

  // 9. Site AMCs
  for (const amc of mockData.mockSiteAMCs) {
    await prisma.siteAMC.upsert({
      where: { id: amc.id },
      update: {},
      create: {
        id: amc.id,
        siteName: amc.siteName || 'Facility Site',
        clientName: amc.clientName || 'Client Corp',
        address: amc.address || 'Kolkata Address',
        assignedEmployeeId: amc.assignedEmployeeId || 'usr-4',
        assignedEmployeeName: amc.assignedEmployeeName || 'Field Tech',
        visitDate: new Date(amc.visitDate || Date.now()),
        status: amc.status || 'SCHEDULED',
        digitalSignOffBy: amc.digitalSignOffBy || null,
        notes: amc.notes || null,
        checklists: {
          create: (amc.checklists || []).map((c, i) => ({
            id: `chk-${amc.id}-${i+1}`,
            taskName: c.taskName || `Task ${i+1}`,
            isCompleted: Boolean(c.isCompleted)
          }))
        }
      }
    });
  }
  console.log('✅ Site AMCs seeded into database');

  // 10. Activity Logs
  for (const log of mockData.mockActivityLogs) {
    await prisma.activityLog.upsert({
      where: { id: log.id },
      update: {},
      create: {
        id: log.id,
        userName: log.userName || 'System',
        action: log.action || 'System Audit Event',
        module: log.module || 'System',
        ipAddress: log.ipAddress || '127.0.0.1',
        timestamp: new Date(log.timestamp || Date.now())
      }
    });
  }
  console.log('✅ Activity Logs seeded into database');

  console.log('🎉 Full Akash CRM Database Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error('Seeding error:', e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });

