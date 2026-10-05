import { PrismaClient } from '@prisma/client';
const prisma = new PrismaClient();

async function main() {
  console.log('Seeding multi-category assets...');

  // Get first department or null
  const itDept = await prisma.department.findFirst({ where: { code: 'ITEG' } });
  const adminDept = await prisma.department.findFirst({ where: { name: { contains: 'Account' } } });
  const csDept = await prisma.department.findFirst();

  const now = new Date();
  const dateIn3Days = new Date(Date.now() + 3 * 24 * 60 * 60 * 1000);
  const dateIn25Days = new Date(Date.now() + 25 * 24 * 60 * 60 * 1000);
  const dateExpired = new Date(Date.now() - 2 * 24 * 60 * 60 * 1000);
  const dateLastMonth = new Date(Date.now() - 28 * 24 * 60 * 60 * 1000);

  const sampleAssets = [
    // 1. AirFiber - Expiring Soon (3 days left)
    {
      assetTag: 'AF/2026/001',
      serialNumber: 'SN-JIO-AF-98214',
      category: 'AIR_FIBER',
      make: 'Jio',
      model: 'AirFiber 5G Ultra Plus',
      modelNumber: 'JMR-541',
      location: 'Admin Block - 2nd Floor',
      departmentId: adminDept?.id || null,
      serviceProvider: 'JIO',
      simNumber: '8991872019482910384',
      planDetails: '100 Mbps Unlimited AirFiber Plan',
      lastRechargeDate: dateLastMonth,
      rechargeExpiryDate: dateIn3Days,
      monthlyCost: 1199.00,
      condition: 'BRAND_NEW',
      status: 'AVAILABLE',
      remarks: 'Primary internet gateway for administrative wing',
    },
    // 2. AirFiber - Active (25 days left)
    {
      assetTag: 'AF/2026/002',
      serialNumber: 'SN-AIRTEL-AF-44120',
      category: 'AIR_FIBER',
      make: 'Airtel',
      model: 'Xstream AirFiber 5G Hub',
      modelNumber: 'AT-X5G-200',
      location: 'Computer Lab 1 - Ground Floor',
      departmentId: itDept?.id || csDept?.id || null,
      serviceProvider: 'AIRTEL',
      simNumber: '8991458291048291033',
      planDetails: '200 Mbps High-Speed Lab Plan',
      lastRechargeDate: new Date(Date.now() - 5 * 24 * 60 * 60 * 1000),
      rechargeExpiryDate: dateIn25Days,
      monthlyCost: 1499.00,
      condition: 'GOOD',
      status: 'AVAILABLE',
      remarks: 'High-speed internet dedicated for Lab 1 online exams',
    },
    // 3. AirFiber - Expired (2 days overdue)
    {
      assetTag: 'AF/2026/003',
      serialNumber: 'SN-BSNL-AF-11029',
      category: 'AIR_FIBER',
      make: 'BSNL',
      model: 'Bharat AirFiber Outdoor CPE',
      modelNumber: 'BAF-600',
      location: 'Library Reading Hall',
      departmentId: null,
      serviceProvider: 'BSNL',
      simNumber: '8991341029482910948',
      planDetails: '50 Mbps Campus Reading Wi-Fi',
      lastRechargeDate: new Date(Date.now() - 32 * 24 * 60 * 60 * 1000),
      rechargeExpiryDate: dateExpired,
      monthlyCost: 799.00,
      condition: 'GOOD',
      status: 'AVAILABLE',
      remarks: 'Needs immediate recharge renewal for library students',
    },
    // 4. Router
    {
      assetTag: 'RT/2026/001',
      serialNumber: 'SN-CISCO-RT-55102',
      category: 'ROUTER',
      make: 'Cisco',
      model: 'Catalyst 2960 Enterprise Router',
      modelNumber: 'CISCO-C2960-48P',
      location: 'Main Server Room - Rack 02',
      departmentId: itDept?.id || null,
      serviceProvider: 'OTHER',
      ipAddress: '192.168.1.1',
      condition: 'BRAND_NEW',
      status: 'AVAILABLE',
      remarks: 'Core gigabit routing switch for campus backbone',
    },
    // 5. Whiteboard Panel
    {
      assetTag: 'WP/2026/001',
      serialNumber: 'SN-MAXHUB-75-9921',
      category: 'WHITEBOARD_PANEL',
      make: 'Maxhub',
      model: 'V6 Classic Series 75" 4K',
      modelNumber: 'MX-V6-75C',
      screenSize: '75 inch',
      location: 'Seminar Hall A',
      departmentId: itDept?.id || null,
      condition: 'BRAND_NEW',
      status: 'AVAILABLE',
      remarks: 'Interactive touchscreen with digital pen and wireless casting',
    },
    // 6. Smart TV
    {
      assetTag: 'TV/2026/001',
      serialNumber: 'SN-SAMS-65-88392',
      category: 'SMART_TV',
      make: 'Samsung',
      model: 'Crystal UHD 4K 65"',
      modelNumber: 'UA65CU8000',
      screenSize: '65 inch',
      location: 'Conference Room 1',
      departmentId: adminDept?.id || null,
      condition: 'GOOD',
      status: 'AVAILABLE',
      remarks: 'Display for academic council and guest lectures',
    },
    // 7. Printer
    {
      assetTag: 'PR/2026/001',
      serialNumber: 'SN-HP-LJ-33918',
      category: 'PRINTER',
      make: 'HP',
      model: 'LaserJet Pro M404dn Duplex',
      modelNumber: 'M404dn',
      location: 'Examination Cell - Room 104',
      departmentId: adminDept?.id || null,
      ipAddress: '192.168.1.45',
      inkCartridgeType: 'HP 76A / 76X Black Toner',
      condition: 'GOOD',
      status: 'AVAILABLE',
      remarks: 'High-speed duplex network printer for question papers and marksheets',
    },
    // 8. Monitor
    {
      assetTag: 'MO/2026/001',
      serialNumber: 'SN-DELL-MN-27411',
      category: 'MONITOR',
      make: 'Dell',
      model: 'UltraSharp 27" 4K USB-C Hub',
      modelNumber: 'U2723QE',
      screenSize: '27 inch',
      location: 'AI & Robotics Lab - Workstation 1',
      departmentId: itDept?.id || null,
      condition: 'BRAND_NEW',
      status: 'AVAILABLE',
      remarks: 'IPS Black color-calibrated display for CAD and simulation',
    },
  ];

  for (const item of sampleAssets) {
    const existing = await prisma.asset.findUnique({ where: { assetTag: item.assetTag } });
    if (!existing) {
      const created = await prisma.asset.create({ data: item });
      console.log(`Created ${item.category}: ${item.assetTag} (${item.make} ${item.model})`);

      // If AirFiber, add sample recharge history record
      if (item.category === 'AIR_FIBER') {
        await prisma.rechargeHistory.create({
          data: {
            assetId: created.id,
            amount: item.monthlyCost || 999.00,
            validityDays: 30,
            rechargeDate: item.lastRechargeDate || now,
            newExpiryDate: item.rechargeExpiryDate || now,
            transactionId: `TXN-${Math.floor(100000 + Math.random() * 900000)}`,
            paymentMode: 'UPI',
            serviceProvider: item.serviceProvider || 'JIO',
            planDetails: item.planDetails,
            notes: 'Initial activation and monthly cycle recharge',
          },
        });
      }
    }
  }

  console.log('Seeding completed successfully!');
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
