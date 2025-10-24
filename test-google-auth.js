const { google } = require('googleapis');
const fs = require('fs');

// Read the env file
const envContent = fs.readFileSync('.env.local', 'utf8');
const keyMatch = envContent.match(/GOOGLE_SERVICE_ACCOUNT_KEY='(.+?)'/s);

if (!keyMatch) {
  console.error('Could not find GOOGLE_SERVICE_ACCOUNT_KEY');
  process.exit(1);
}

const keyString = keyMatch[1];
console.log('Raw key string (first 200 chars):', keyString.substring(0, 200));

// Try to parse it
let credentials;
try {
  credentials = JSON.parse(keyString);
  console.log('✅ JSON parsing successful');
  console.log('Private key starts with:', credentials.private_key.substring(0, 50));
} catch (e) {
  console.error('❌ JSON parsing failed:', e.message);
  process.exit(1);
}

// Try to authenticate
async function testAuth() {
  try {
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    
    const client = await auth.getClient();
    console.log('✅ Google Auth successful!');
    
    // Try to access a sheet
    const sheets = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.get({
      spreadsheetId: '1yYcSd6r8MJodVbZSZVwY8hkijPxxuWSTfNYDWBYdW0g',
    });
    
    console.log('✅ Sheet access successful!');
    console.log('Sheet title:', response.data.properties.title);
  } catch (e) {
    console.error('❌ Auth or sheet access failed:', e.message);
  }
}

testAuth();
