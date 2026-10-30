import { loginUser } from '../src/services/auth.service.js';
import { getDashboardMetrics, getAssetsList, getAssetById } from '../src/services/asset.service.js';
import { getAllocationsList } from '../src/services/allocation.service.js';
import { getStudentsList } from '../src/services/user.service.js';
import { getMasterSettingsOverview } from '../src/services/settings.service.js';
import { prisma } from '../src/config/db.js';

async function testAll() {
  console.log('🧪 Running comprehensive MongoDB validation suite...');

  // 1. Test Login
  console.log('\n1. Testing Auth Login (admin@ssism.ac.in)...');
  const loginResult = await loginUser({ email: 'admin@ssism.ac.in', password: 'admin123', ipAddress: '127.0.0.1' });
  console.log(`✅ Logged in as: ${loginResult.user.name} (${loginResult.user.role}), ID: ${loginResult.user.id}`);

  // 2. Test Dashboard Metrics
  console.log('\n2. Testing Dashboard Metrics...');
  const metrics = await getDashboardMetrics();
  console.log(`✅ Total Assets: ${metrics.totalAssets}, Issued: ${metrics.issuedAssets}, Available: ${metrics.availableAssets}`);

  // 3. Test Assets List
  console.log('\n3. Testing Assets List...');
  const assetsRes = await getAssetsList({ page: 1, limit: 5 });
  console.log(`✅ Retrieved ${assetsRes.assets.length} assets, Total in DB: ${assetsRes.pagination.total}`);
  const firstAssetId = assetsRes.assets[0].id;
  console.log(`   Sample Asset ID: ${firstAssetId} (${assetsRes.assets[0].assetTag} - ${assetsRes.assets[0].model})`);

  // 4. Test Single Asset By ObjectId
  console.log('\n4. Testing getAssetById with MongoDB ObjectId...');
  const singleAsset = await getAssetById(firstAssetId);
  console.log(`✅ Found Asset by ID: ${singleAsset.assetTag}, Make: ${singleAsset.make}`);

  // 5. Test Allocations List
  console.log('\n5. Testing Allocations List...');
  const allocRes = await getAllocationsList({ page: 1, limit: 5 });
  console.log(`✅ Retrieved ${allocRes.allocations.length} allocations, Total: ${allocRes.total}`);

  // 6. Test Students List
  console.log('\n6. Testing Students Directory...');
  const studentsRes = await getStudentsList({ page: 1, limit: 5 });
  console.log(`✅ Retrieved ${studentsRes.students.length} students, Total: ${studentsRes.pagination.total}`);

  // 7. Test Settings Overview
  console.log('\n7. Testing Master Settings Overview...');
  const settings = await getMasterSettingsOverview();
  console.log(`✅ Departments: ${settings.departments.length}, Categories: ${settings.categories.length}`);

  console.log('\n🎉 ALL SERVICES VERIFIED AND WORKING 100% WITH MONGODB!');
  await prisma.$disconnect();
  process.exit(0);
}

testAll().catch((err) => {
  console.error('❌ Test failed:', err);
  process.exit(1);
});
