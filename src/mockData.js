// Comprehensive Mock Data store for VS DIGITECH Enterprise CRM

const mockUsers = [
  {
    id: "usr-superadmin",
    name: "Super Admin",
    email: "superadmin@akashcrm.com",
    password: "password123",
    phone: "+91 99999 00000",
    designation: "System Superadmin",
    role: "SUPERADMIN",
    isMfaEnabled: true,
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
  },
  {
    id: "usr-normaluser",
    name: "Normal User",
    email: "user@akashcrm.com",
    password: "password123",
    phone: "+91 99999 11111",
    designation: "Field Representative",
    role: "USER",
    isMfaEnabled: false,
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150"
  },
  {
    id: "usr-1",
    name: "Rahul Sharma",
    email: "rahul.sharma@vsdigitech.com",
    password: "password123",
    phone: "+91 98300 12345",
    designation: "Chief Operations Officer",
    role: "MASTER_ADMIN",
    isMfaEnabled: true,
    avatarUrl: "https://images.unsplash.com/photo-1534528741775-53994a69daeb?w=150"
  },
  {
    id: "usr-2",
    name: "Priya Das",
    email: "priya.das@vsdigitech.com",
    password: "password123",
    phone: "+91 98311 23456",
    designation: "Inventory Lead",
    role: "SUB_ADMIN",
    isMfaEnabled: true,
    avatarUrl: "https://images.unsplash.com/photo-1494790108377-be9c29b29330?w=150"
  },
  {
    id: "usr-3",
    name: "Amitabh Roy",
    email: "amitabh.roy@vsdigitech.com",
    password: "password123",
    phone: "+91 98322 34567",
    designation: "Facility Manager",
    role: "FACILITY_MANAGER",
    isMfaEnabled: false,
    avatarUrl: "https://images.unsplash.com/photo-1507003211169-0a1dd7228f2d?w=150"
  },
  {
    id: "usr-4",
    name: "Sujan Mukhopadhyay",
    email: "sujan.m@vsdigitech.com",
    password: "password123",
    phone: "+91 98333 45678",
    designation: "Senior Field Engineer",
    role: "SERVICE_PERSONNEL",
    isMfaEnabled: true,
    avatarUrl: "https://images.unsplash.com/photo-1500648767791-00dcc994a43e?w=150"
  },
  {
    id: "usr-5",
    name: "Rajesh Kumar",
    email: "rajesh.k@vsdigitech.com",
    password: "password123",
    phone: "+91 98344 56789",
    designation: "HVAC & Network Technician",
    role: "SERVICE_PERSONNEL",
    isMfaEnabled: false,
    avatarUrl: "https://images.unsplash.com/photo-1472099645785-5658abf4ff4e?w=150"
  }
];

const mockMeetings = [
  {
    id: "mtg-101",
    title: "Quarterly Server Rack Maintenance & Fiber Splicing",
    branch: "Main Branch - Kolkata",
    department: "IT & Network Operations",
    project: "TCS Fiber Infrastructure Maintenance",
    clientName: "TCS Salt Lake Campus II",
    clientAddress: "Block EP & GP, Sector V, Salt Lake, Kolkata 700091",
    location: "Server Room 3B, TCS Sector V",
    meetingFeedback: "Client requested additional fiber splice tray backup for next quarter audit.",
    photos: JSON.stringify(["https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=400"]),
    scheduledAt: "2026-09-03T10:00:00.000Z",
    status: "SCHEDULED",
    assignedToId: "usr-4",
    assignedToName: "Sujan Mukhopadhyay",
    agenda: "Audit 48-port core switches, replace damaged patch cords, clean optical fiber splice trays.",
    deliverables: "Diagnostic report signed by TCS IT admin, fiber loss testing log sheet.",
    outcomeNotes: null,
    serviceUpdates: "Pre-visit check completed. High-precision optical power meter requested."
  },
  {
    id: "mtg-102",
    title: "CCTV Camera Calibration & Biometric Controller Setup",
    branch: "Sector V Tech Office",
    department: "Field Engineering & Support",
    project: "Wipro Surveillance Installation",
    clientName: "Wipro Tech Park",
    clientAddress: "Plot 8, Block DM, Sector V, Bidhannagar, Kolkata 700091",
    location: "Gate 2 ANPR Control Tower",
    meetingFeedback: "10 cameras successfully installed. POE switch replacement needed for remaining 2 cameras.",
    photos: JSON.stringify(["https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=400"]),
    scheduledAt: "2026-09-02T14:30:00.000Z",
    status: "IN_PROGRESS",
    assignedToId: "usr-5",
    assignedToName: "Rajesh Kumar",
    agenda: "Mount 12 IP bullet cameras, calibrate ANPR system at gate 2, map face recognition terminal to attendance server.",
    deliverables: "Camera matrix layout sheet, door controller IP assignment table.",
    outcomeNotes: "10 cameras configured. 2 cameras pending POE switch replacement.",
    serviceUpdates: "Submitting material request for 1x 8-port Gigabit POE switch."
  },
  {
    id: "mtg-103",
    title: "Annual Fire Alarm & Access Control Audit",
    branch: "Corporate HQ",
    department: "Electrical & Automation",
    project: "CTS Fire Safety AMC Audit",
    clientName: "Cognizant Technology Solutions",
    clientAddress: "Vidyasagar Complex, Salt Lake Sector V, Kolkata",
    location: "Main Electrical Control Room & Fire Panel",
    meetingFeedback: "All smoke detectors and fire panel batteries passed safety inspection.",
    photos: JSON.stringify(["https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=400"]),
    scheduledAt: "2026-09-01T11:00:00.000Z",
    status: "COMPLETED",
    assignedToId: "usr-4",
    assignedToName: "Sujan Mukhopadhyay",
    agenda: "Full smoke detector testing, battery voltage check on master alarm panel.",
    deliverables: "Compliance safety certificate, replaced battery disposal log.",
    outcomeNotes: "Audit passed with 100% compliance. All panels green.",
    serviceUpdates: "Job completed ahead of schedule."
  }
];

const mockMaterialRequests = [
  {
    id: "mat-1",
    meetingId: "mtg-102",
    meetingTitle: "CCTV Camera Calibration & Biometric Controller Setup",
    itemTitle: "D-Link 8-Port Gigabit POE+ Industrial Switch",
    quantity: 2,
    unit: "Pcs",
    justification: "Existing switch burned due to power surge at Gate 2 installation site.",
    expectedUsage: "Immediate installation for Wipro ANPR camera feed restoration.",
    status: "PENDING_MASTER_ADMIN", // PENDING_MASTER_ADMIN -> PENDING_FACILITY_MANAGER -> APPROVED
    requestedBy: "Rajesh Kumar",
    masterAdminApprovedBy: null,
    facilityManagerApprovedBy: null,
    createdAt: "2026-09-02T15:10:00.000Z"
  },
  {
    id: "mat-2",
    meetingId: "mtg-101",
    meetingTitle: "Quarterly Server Rack Maintenance & Fiber Splicing",
    itemTitle: "Cat6 Patch Cord 1m High-Speed Gold Plated",
    quantity: 50,
    unit: "Pcs",
    justification: "Worn out cables causing packet drops in TCS core rack #4.",
    expectedUsage: "Clean rack rewire during scheduled downtime window.",
    status: "PENDING_FACILITY_MANAGER",
    requestedBy: "Sujan Mukhopadhyay",
    masterAdminApprovedBy: "Rahul Sharma (Master Admin)",
    facilityManagerApprovedBy: null,
    createdAt: "2026-09-02T09:30:00.000Z"
  },
  {
    id: "mat-3",
    meetingId: "mtg-103",
    meetingTitle: "Annual Fire Alarm & Access Control Audit",
    itemTitle: "12V 7Ah Sealed Lead Acid Battery for Alarm Panel",
    quantity: 4,
    unit: "Units",
    justification: "Backup power batteries degraded below threshold voltage.",
    expectedUsage: "Replaced during CTS compliance audit.",
    status: "APPROVED",
    requestedBy: "Sujan Mukhopadhyay",
    masterAdminApprovedBy: "Rahul Sharma (Master Admin)",
    facilityManagerApprovedBy: "Amitabh Roy (Facility Manager)",
    createdAt: "2026-09-01T08:00:00.000Z"
  }
];

const mockAttendance = [
  {
    id: "att-1",
    userId: "usr-4",
    userName: "Sujan Mukhopadhyay",
    date: "2026-09-02",
    checkInTime: "09:15 AM",
    checkOutTime: null,
    status: "PRESENT",
    location: "TCS Salt Lake Campus",
    method: "MOBILE"
  },
  {
    id: "att-2",
    userId: "usr-5",
    userName: "Rajesh Kumar",
    date: "2026-09-02",
    checkInTime: "09:30 AM",
    checkOutTime: null,
    status: "PRESENT",
    location: "Wipro Tech Park Sector V",
    method: "BIOMETRIC"
  },
  {
    id: "att-3",
    userId: "usr-3",
    userName: "Amitabh Roy",
    date: "2026-09-02",
    checkInTime: "09:00 AM",
    checkOutTime: "06:00 PM",
    status: "PRESENT",
    location: "VS DIGITECH HO Dumdum",
    method: "WEB"
  }
];

const mockLeaves = [
  {
    id: "lv-101",
    userId: "usr-5",
    userName: "Rajesh Kumar",
    leaveType: "CASUAL",
    startDate: "2026-09-10",
    endDate: "2026-09-12",
    reason: "Family medical emergency in hometown",
    status: "PENDING",
    approvedBy: null
  },
  {
    id: "lv-102",
    userId: "usr-4",
    userName: "Sujan Mukhopadhyay",
    leaveType: "EARNED",
    startDate: "2026-08-20",
    endDate: "2026-08-22",
    reason: "Personal vacation",
    status: "APPROVED",
    approvedBy: "Amitabh Roy"
  }
];

const mockShifts = [
  {
    id: "sh-1",
    userId: "usr-4",
    userName: "Sujan Mukhopadhyay",
    shiftName: "General Shift",
    startTime: "09:00 AM",
    endTime: "06:00 PM",
    date: "2026-09-02",
    notes: "Assigned to TCS site visits"
  },
  {
    id: "sh-2",
    userId: "usr-5",
    userName: "Rajesh Kumar",
    shiftName: "Evening Shift",
    startTime: "01:00 PM",
    endTime: "10:00 PM",
    date: "2026-09-02",
    notes: "Wipro CCTV night deployment supervision"
  }
];

const mockSalaryRecords = [
  {
    id: "sal-1",
    userId: "usr-4",
    userName: "Sujan Mukhopadhyay",
    designation: "Senior Field Engineer",
    month: "August",
    year: 2026,
    baseSalary: 45000,
    overtimeHours: 12,
    overtimePay: 4500,
    allowances: 3500,
    deductions: 2400,
    pfDeduction: 1800,
    taxDeduction: 1200,
    netSalary: 47600,
    status: "PAID",
    generatedAt: "2026-08-31"
  },
  {
    id: "sal-2",
    userId: "usr-5",
    userName: "Rajesh Kumar",
    designation: "HVAC & Network Technician",
    month: "August",
    year: 2026,
    baseSalary: 38000,
    overtimeHours: 8,
    overtimePay: 2800,
    allowances: 2500,
    deductions: 1900,
    pfDeduction: 1500,
    taxDeduction: 900,
    netSalary: 39900,
    status: "PROCESSED",
    generatedAt: "2026-08-31"
  }
];

const mockPersonnelLocations = [
  {
    id: "loc-1",
    userId: "usr-4",
    userName: "Sujan Mukhopadhyay",
    designation: "Senior Field Engineer",
    latitude: 22.5726,
    longitude: 88.4331,
    address: "Sector V, Salt Lake, Kolkata 700091",
    batteryLevel: 88,
    speed: 15.5,
    status: "ACTIVE",
    lastUpdated: "2 mins ago"
  },
  {
    id: "loc-2",
    userId: "usr-5",
    userName: "Rajesh Kumar",
    designation: "Technician",
    latitude: 22.5855,
    longitude: 88.4201,
    address: "Dumdum Junction, Kolkata 700030",
    batteryLevel: 64,
    speed: 0.0,
    status: "STOPPED",
    lastUpdated: "5 mins ago"
  }
];

const mockGeofenceAlerts = [
  {
    id: "gf-1",
    userId: "usr-5",
    userName: "Rajesh Kumar",
    zoneName: "Sector V Service Corridor",
    alertType: "DEVIATION",
    message: "Personnel moved 1.2km outside designated assignment zone.",
    timestamp: "2026-09-02T14:15:00.000Z"
  },
  {
    id: "gf-2",
    userId: "usr-4",
    userName: "Sujan Mukhopadhyay",
    zoneName: "TCS Client Campus Boundary",
    alertType: "ENTRY",
    message: "Checked in at TCS Gate 3 geofence.",
    timestamp: "2026-09-02T09:48:00.000Z"
  }
];

const mockProducts = [
  {
    id: "prod-1",
    code: "VS-NET-001",
    name: "Hikvision 4MP IP Dome Camera IR 30m",
    category: "Security & Surveillance",
    brand: "Hikvision",
    stockQuantity: 42,
    unit: "Pcs",
    minStockAlert: 10,
    unitPrice: 3850,
    qrCodeUrl: "QR-VS-NET-001"
  },
  {
    id: "prod-2",
    code: "VS-NET-002",
    name: "D-Link 24-Port Gigabit Smart Managed Switch",
    category: "Networking Equipment",
    brand: "D-Link",
    stockQuantity: 4, // LOW STOCK
    unit: "Pcs",
    minStockAlert: 8,
    unitPrice: 14500,
    qrCodeUrl: "QR-VS-NET-002"
  },
  {
    id: "prod-3",
    code: "VS-CAB-003",
    name: "Finolex Cat6 UTP 305m Ethernet Cable Drum",
    category: "Cables & Wiring",
    brand: "Finolex",
    stockQuantity: 18,
    unit: "Rolls",
    minStockAlert: 5,
    unitPrice: 8900,
    qrCodeUrl: "QR-VS-CAB-003"
  },
  {
    id: "prod-4",
    code: "VS-PWR-004",
    name: "APC Smart-UPS 1500VA LCD 230V",
    category: "Power Systems",
    brand: "APC",
    stockQuantity: 3, // LOW STOCK
    unit: "Units",
    minStockAlert: 5,
    unitPrice: 28500,
    qrCodeUrl: "QR-VS-PWR-004"
  },
  {
    id: "prod-5",
    code: "VS-SEC-005",
    name: "Matrix Fingerprint & RFID Access Terminal",
    category: "Access Control",
    brand: "Matrix",
    stockQuantity: 15,
    unit: "Units",
    minStockAlert: 4,
    unitPrice: 12400,
    qrCodeUrl: "QR-VS-SEC-005"
  }
];

const mockQuotations = [
  {
    id: "q-2026-001",
    quotationNumber: "QT/2026/089",
    clientName: "PwC India Ltd",
    clientEmail: "procurement@pwc.in",
    clientPhone: "+91 33 4400 1100",
    totalAmount: 185000,
    gstAmount: 33300,
    grandTotal: 218300,
    status: "APPROVED",
    validUntil: "2026-09-30",
    itemsJson: JSON.stringify([
      { name: "24-Port POE Switch", qty: 2, price: 28000, total: 56000 },
      { name: "Dome Cameras 4MP", qty: 20, price: 4200, total: 84000 },
      { name: "Installation & Commissioning", qty: 1, price: 45000, total: 45000 }
    ]),
    createdAt: "2026-08-25"
  },
  {
    id: "q-2026-002",
    quotationNumber: "QT/2026/090",
    clientName: "Bande Ali & Sons Commercial Complex",
    clientEmail: "info@bandeali.com",
    clientPhone: "+91 98305 99887",
    totalAmount: 95000,
    gstAmount: 17100,
    grandTotal: 112100,
    status: "SENT",
    validUntil: "2026-09-20",
    itemsJson: JSON.stringify([
      { name: "Fire Alarm Control Panel 4-Zone", qty: 1, price: 45000, total: 45000 },
      { name: "Optical Smoke Detectors", qty: 25, price: 2000, total: 50000 }
    ]),
    createdAt: "2026-08-28"
  }
];

const mockInvoices = [
  {
    id: "inv-2026-01",
    invoiceNumber: "INV/VS/2026/412",
    quotationId: "q-2026-001",
    clientName: "PwC India Ltd",
    clientEmail: "accounts@pwc.in",
    totalAmount: 218300,
    paidAmount: 100000,
    balanceAmount: 118300,
    dueDate: "2026-09-15",
    status: "PARTIAL",
    itemsJson: JSON.stringify([
      { name: "24-Port POE Switch", qty: 2, amount: 66080 },
      { name: "Dome Cameras 4MP", qty: 20, amount: 99120 },
      { name: "Services & Cabling", qty: 1, amount: 53100 }
    ]),
    createdAt: "2026-08-26"
  },
  {
    id: "inv-2026-02",
    invoiceNumber: "INV/VS/2026/413",
    quotationId: null,
    clientName: "HDFC Bank Dumdum Branch",
    clientEmail: "ops.dumdum@hdfcbank.com",
    totalAmount: 48500,
    paidAmount: 0,
    balanceAmount: 48500,
    dueDate: "2026-09-01",
    status: "OVERDUE",
    itemsJson: JSON.stringify([
      { name: "UPS Battery Replacement 12V 42Ah", qty: 4, amount: 48500 }
    ]),
    createdAt: "2026-08-15"
  }
];

const mockPurchases = [
  {
    id: "pur-1",
    purchaseOrderNo: "PO/2026/551",
    vendorName: "Compuage Infocom India Pvt Ltd",
    vendorGst: "19AABCC1234F1ZB",
    invoiceNo: "CI-98421",
    category: "Networking Equipment",
    totalAmount: 142000,
    gstAmount: 25560,
    status: "APPROVED",
    itemsJson: JSON.stringify([
      { item: "D-Link 24-Port Switches", qty: 10, unitPrice: 14200 }
    ]),
    createdAt: "2026-08-22"
  },
  {
    id: "pur-2",
    purchaseOrderNo: "PO/2026/552",
    vendorName: "Aditya Infotech Ltd (CP PLUS)",
    vendorGst: "19AADCA5678E1ZC",
    invoiceNo: "AIL/KOL/884",
    category: "Security & Surveillance",
    totalAmount: 85000,
    gstAmount: 15300,
    status: "PENDING",
    itemsJson: JSON.stringify([
      { item: "4MP Bullet IP Cameras", qty: 25, unitPrice: 3400 }
    ]),
    createdAt: "2026-09-01"
  }
];

const mockVouchers = [
  {
    id: "vch-1",
    voucherNo: "VCH/PAY/2026/088",
    type: "PAYMENT",
    amount: 142000,
    accountHead: "Vendor Payment - Compuage Infocom",
    narration: "Full settlement for PO/2026/551 against invoice CI-98421",
    status: "APPROVED",
    approvedBy: "Rahul Sharma",
    createdAt: "2026-08-24"
  },
  {
    id: "vch-2",
    voucherNo: "VCH/RCT/2026/142",
    type: "RECEIPT",
    amount: 100000,
    accountHead: "Client Payment - PwC India Ltd",
    narration: "Advance payment received via NEFT against INV/VS/2026/412",
    status: "APPROVED",
    approvedBy: "Priya Das",
    createdAt: "2026-08-28"
  },
  {
    id: "vch-3",
    voucherNo: "VCH/JRN/2026/019",
    type: "JOURNAL",
    amount: 4500,
    accountHead: "Travel Allowance Adjustment",
    narration: "Reimbursement of site transport for Sujan Mukhopadhyay",
    status: "PENDING",
    approvedBy: null,
    createdAt: "2026-09-02"
  }
];

const mockSiteAMCs = [
  {
    id: "amc-101",
    siteName: "Airtel Data Center Newtown",
    clientName: "Bharti Airtel Ltd",
    address: "Action Area II, New Town, Rajarhat, Kolkata 700156",
    assignedEmployeeId: "usr-4",
    assignedEmployeeName: "Sujan Mukhopadhyay",
    visitDate: "2026-09-05",
    status: "SCHEDULED",
    digitalSignOffBy: null,
    notes: "Monthly preventive maintenance check of server cooling and UPS battery banks.",
    checklists: [
      { id: "chk-1", taskName: "Check UPS input & output voltage harmonic distortion", isCompleted: false },
      { id: "chk-2", taskName: "Inspect Precision AC filters & coolant pressure", isCompleted: false },
      { id: "chk-3", taskName: "Test Biometric access doors override switch", isCompleted: false }
    ]
  },
  {
    id: "amc-102",
    siteName: "Fortis Hospital Anandapur",
    clientName: "Fortis Healthcare Kolkata",
    address: "EM Bypass, Anandapur, Kolkata 700107",
    assignedEmployeeId: "usr-5",
    assignedEmployeeName: "Rajesh Kumar",
    visitDate: "2026-09-01",
    status: "COMPLETED",
    digitalSignOffBy: "Dr. S. K. Banerjee (Facility Director)",
    notes: "Quarterly CCTV and Nurse Call System inspection completed cleanly.",
    checklists: [
      { id: "chk-4", taskName: "Clean ICU camera domes & adjust focal length", isCompleted: true },
      { id: "chk-5", taskName: "Verify emergency alarm response speed (<2 sec)", isCompleted: true },
      { id: "chk-6", taskName: "Update NVR firmware to v4.8.2", isCompleted: true }
    ]
  }
];

const mockActivityLogs = [
  {
    id: "log-1",
    userName: "Rahul Sharma",
    action: "Approved Material Request #mat-3 (12V SLA Batteries)",
    module: "Service Meetings",
    ipAddress: "192.168.1.10",
    timestamp: "2026-09-01T09:12:00.000Z"
  },
  {
    id: "log-2",
    userName: "Priya Das",
    action: "Created Vendor Purchase PO/2026/552",
    module: "Purchase Module",
    ipAddress: "192.168.1.14",
    timestamp: "2026-09-01T11:45:00.000Z"
  },
  {
    id: "log-3",
    userName: "Rajesh Kumar",
    action: "Submitted Material Request #mat-1 for POE Switch",
    module: "Service Meetings",
    ipAddress: "182.74.12.98",
    timestamp: "2026-09-02T15:10:00.000Z"
  }
const mockProjects = [
  {
    id: "proj-1",
    name: "TCS Salt Lake Optical Fiber Splicing & Core Upgrade",
    startDate: "2026-08-01",
    endDate: "2026-10-31",
    image: "https://images.unsplash.com/photo-1558494949-ef010cbdcc31?w=500",
    customerId: "usr-normaluser",
    customerName: "TCS Consultancy Services",
    employeeId: "usr-4",
    employeeName: "Sujan Mukhopadhyay",
    budget: 250000,
    estimatedHours: 160,
    description: "Full fiber splicing, core switch installation, and diagnostic testing for TCS Campus II.",
    tag: "Networking & Fiber",
    status: "In Progress"
  },
  {
    id: "proj-2",
    name: "Wipro ANPR Surveillance & Gate Biometrics",
    startDate: "2026-08-15",
    endDate: "2026-11-15",
    image: "https://images.unsplash.com/photo-1557597774-9d273605dfa9?w=500",
    customerId: "usr-normaluser",
    customerName: "Wipro Tech Park",
    employeeId: "usr-5",
    employeeName: "Rajesh Kumar",
    budget: 180000,
    estimatedHours: 120,
    description: "Installation of 12 IP cameras, ANPR controller setup at Gate 2, biometric integration.",
    tag: "CCTV & Security",
    status: "In Progress"
  },
  {
    id: "proj-3",
    name: "Cognizant Annual Fire Alarm & Access Audit",
    startDate: "2026-07-01",
    endDate: "2026-09-01",
    image: "https://images.unsplash.com/photo-1581092160607-ee22621dd758?w=500",
    customerId: "usr-normaluser",
    customerName: "Cognizant Technology Solutions",
    employeeId: "usr-4",
    employeeName: "Sujan Mukhopadhyay",
    budget: 95000,
    estimatedHours: 60,
    description: "Fire panel testing, smoke detector calibration, access control system compliance audit.",
    tag: "Safety & Audit",
    status: "Completed"
  }
];

module.exports = {
  mockUsers,
  mockMeetings,
  mockMaterialRequests,
  mockAttendance,
  mockLeaves,
  mockShifts,
  mockSalaryRecords,
  mockPersonnelLocations,
  mockGeofenceAlerts,
  mockProducts,
  mockQuotations,
  mockInvoices,
  mockPurchases,
  mockVouchers,
  mockSiteAMCs,
  mockActivityLogs,
  mockProjects
};
