const bcrypt = require('bcrypt');

async function testBcrypt() {
  const password = 'TestPass123';
  const saltRounds = 12;
  
  console.log(`Testing bcrypt with ${saltRounds} rounds for password: "${password}"`);
  
  try {
    // Generate hash
    const hash = await bcrypt.hash(password, saltRounds);
    console.log(`Generated hash: ${hash}`);
    
    // Verify it works
    const isValid = await bcrypt.compare(password, hash);
    console.log(`Verification result: ${isValid}`);
    
    // Test with the hash from our script
    const scriptHash = '$2b$12$LQv3c1yqBWVHxkd0LHAkCOYz6TtxMQJqhN8/LewdBPj4J/HS.i8Wm';
    const scriptValid = await bcrypt.compare(password, scriptHash);
    console.log(`Script hash verification: ${scriptValid}`);
    
    if (scriptValid) {
      console.log('✅ Script hash works!');
    } else {
      console.log('❌ Script hash does not work');
    }
    
  } catch (error) {
    console.error('Error:', error);
  }
}

testBcrypt();

