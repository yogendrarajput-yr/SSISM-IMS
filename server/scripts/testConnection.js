/**
 * Lightweight Verification Script: Ping live Render backend and verify connection.
 */
const API_URL = process.env.API_URL || 'https://ssism-ims-backend.onrender.com';

async function testBackend() {
  console.log('======================================================');
  console.log('🔍 SSISM IMS Live Render Backend Connectivity Test');
  console.log('======================================================');
  console.log(`Target URL: ${API_URL}`);

  try {
    const startTime = Date.now();
    const response = await fetch(`${API_URL}/api/health`, {
      method: 'GET',
      headers: {
        'Accept': 'application/json',
      },
    });

    const elapsed = Date.now() - startTime;
    const data = await response.json();

    console.log(`\n✅ Status Code: ${response.status} ${response.statusText}`);
    console.log(`⏱️ Response Time: ${elapsed}ms`);
    console.log(`📦 Response Body:`, JSON.stringify(data, null, 2));

    // Check CORS Headers
    console.log('\n🔐 CORS & Security Headers:');
    console.log(`  access-control-allow-credentials: ${response.headers.get('access-control-allow-credentials')}`);
    console.log(`  vary: ${response.headers.get('vary')}`);
    console.log(`  x-render-origin-server: ${response.headers.get('x-render-origin-server')}`);

    if (response.ok && data.status === 'healthy') {
      console.log('\n🎉 SUCCESS: Live Render Backend is HEALTHY and REACHABLE!');
      process.exit(0);
    } else {
      console.error('\n⚠️ WARNING: Backend responded but status is unexpected.');
      process.exit(1);
    }
  } catch (error) {
    console.error('\n❌ ERROR: Failed to reach live Render backend:', error.message);
    process.exit(1);
  }
}

testBackend();
