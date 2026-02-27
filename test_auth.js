const api = require('axios');

async function test() {
    try {
        const loginRes = await api.post('http://localhost:4000/auth/login', {
            email: 'admin@flatworld.ph',
            password: 'Admin@123'
        });
        console.log('Login Response:', JSON.stringify(loginRes.data, null, 2));

        const token = loginRes.data.access_token;
        const meRes = await api.get('http://localhost:4000/auth/me', {
            headers: { Authorization: `Bearer ${token}` }
        });
        console.log('Me Response:', JSON.stringify(meRes.data, null, 2));
    } catch (e) {
        console.error('Error:', e.response?.data || e.message);
    }
}

test();
