const { google } = require('googleapis');
const fs = require('fs');

async function testAuth() {
  try {
    const credentials = JSON.parse(fs.readFileSync('google-credentials.json', 'utf8'));
    
    const auth = new google.auth.GoogleAuth({
      credentials,
      scopes: ['https://www.googleapis.com/auth/spreadsheets'],
    });
    
    const client = await auth.getClient();
    console.log('✅ Google Auth successful!');
    
    const sheets = google.sheets({ version: 'v4', auth });
    const response = await sheets.spreadsheets.get({
      spreadsheetId: '1yYcSd6r8MJodVbZSZVwY8hkijPxxuWSTfNYDWBYdW0g',
    });
    
    console.log('✅ Sheet access successful!');
    console.log('Sheet title:', response.data.properties.title);
  } catch (e) {
    console.error('❌ Error:', e.message);
    console.error('Stack:', e.stack);
  }
}

testAuth();
