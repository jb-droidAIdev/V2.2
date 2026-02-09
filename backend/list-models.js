const https = require('https');
require('dotenv').config();

const apiKey = process.env.GEMINI_API_KEY;

if (!apiKey) {
    console.error('No API key found!');
    process.exit(1);
}

const url = `https://generativelanguage.googleapis.com/v1beta/models?key=${apiKey}`;

https.get(url, (res) => {
    let data = '';

    res.on('data', (chunk) => {
        data += chunk;
    });

    res.on('end', () => {
        if (res.statusCode !== 200) {
            console.error(`Error: ${res.statusCode}`);
            console.error(data);
            return;
        }

        try {
            const json = JSON.parse(data);
            console.log('Available Models:');
            if (json.models) {
                json.models.forEach(m => console.log(`- ${m.name} (${m.displayName})`));
            } else {
                console.log('No models found.');
            }
        } catch (e) {
            console.error('Error parsing JSON:', e.message);
        }
    });

}).on('error', (err) => {
    console.error('Request error:', err.message);
});
