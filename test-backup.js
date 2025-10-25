// Test script for backup API endpoints
import fetch from 'node-fetch';

const API_BASE = 'http://localhost:5000/api/backup';

async function testBackupAPI() {
  try {
    console.log('🧪 Testing Backup API...\n');

    // Test 1: Get backup stats
    console.log('1. Getting backup statistics...');
    const statsResponse = await fetch(`${API_BASE}/stats`);
    const stats = await statsResponse.json();
    console.log('✅ Backup stats:', stats);
    console.log('');

    // Test 2: Create a new backup
    console.log('2. Creating a new backup...');
    const createResponse = await fetch(`${API_BASE}/create`, {
      method: 'POST'
    });
    const createResult = await createResult.json();
    console.log('✅ Backup created:', createResult);
    console.log('');

    // Test 3: Get updated stats
    console.log('3. Getting updated backup statistics...');
    const updatedStatsResponse = await fetch(`${API_BASE}/stats`);
    const updatedStats = await updatedStatsResponse.json();
    console.log('✅ Updated backup stats:', updatedStats);
    console.log('');

    console.log('🎉 All backup API tests completed successfully!');

  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Run the test if this file is executed directly
if (import.meta.url === `file://${process.argv[1]}`) {
  testBackupAPI();
}
