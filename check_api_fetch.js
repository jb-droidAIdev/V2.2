async function test() {
    try {
        const loginRes = await fetch('http://localhost:4000/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                email: 'admin@example.com',
                password: 'password123'
            })
        });
        const loginData = await loginRes.json();
        const token = loginData.access_token;
        console.log('Token obtained');

        const endpoints = ['/forms', '/campaigns', '/users', '/audits'];
        for (const endpoint of endpoints) {
            try {
                const res = await fetch('http://localhost:4000' + endpoint, {
                    headers: { Authorization: `Bearer ${token}` }
                });
                if (res.ok) {
                    console.log(`Endpoint ${endpoint}: SUCCESS`);
                } else {
                    const data = await res.json();
                    console.error(`Endpoint ${endpoint}: FAILED with ${res.status}`);
                    console.error(data);
                }
            } catch (e) {
                console.error(`Endpoint ${endpoint}: DISASTER with ${e.message}`);
            }
        }
    } catch (e) {
        console.error('Login failed:', e.message);
    }
}

test();
