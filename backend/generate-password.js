const bcrypt = require('bcrypt');

async function generateHashes() {
  const password = 'TestPass123';
  
  // Generate hash with different rounds to test
  const hash4 = await bcrypt.hash(password, 4);
  const hash10 = await bcrypt.hash(password, 10);
  const hash12 = await bcrypt.hash(password, 12);
  
  console.log('Password:', password);
  console.log('Hash (rounds=4):', hash4);
  console.log('Hash (rounds=10):', hash10);
  console.log('Hash (rounds=12):', hash12);
  
  // Test verification
  console.log('\nVerification tests:');
  console.log('Hash4 matches:', await bcrypt.compare(password, hash4));
  console.log('Hash10 matches:', await bcrypt.compare(password, hash10));
  console.log('Hash12 matches:', await bcrypt.compare(password, hash12));
}

generateHashes().catch(console.error);
