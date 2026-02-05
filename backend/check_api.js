const axios = require('axios');

async function test() {
    try {
        const loginRes = await axios.post('http://localhost:4000/auth/login', {
            email: 'admin@example.com',
            password: 'password123'
        });
        const token = loginRes.data.access_token;
        console.log('Token obtained');

        const endpoints = ['/forms', '/campaigns', '/users', '/audits'];
        for (const endpoint of endpoints) {
            try {
                await axios.get('http://localhost:4000' + endpoint, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                console.log(`Endpoint ${endpoint}: SUCCESS`);
            } catch (e) {
                console.error(`Endpoint ${endpoint}: FAILED with ${e.response?.status || e.message}`);
                if (e.response?.data) console.error(e.response.data);
            }
        }
    } catch (e) {
        console.error('Login failed:', e.message);
    }
}

test();
