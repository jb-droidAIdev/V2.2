const http = require('http');

function post(path, data) {
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: 'localhost', port: 4000, path: path, method: 'POST',
            headers: { 'Content-Type': 'application/json' }
        }, res => {
            let body = '';
            res.on('data', d => body += d);
            res.on('end', () => resolve({ status: res.statusCode, data: JSON.parse(body || '{}') }));
        });
        req.on('error', reject);
        req.write(JSON.stringify(data));
        req.end();
    });
}

function getUrl(path, token) {
    return new Promise((resolve, reject) => {
        const req = http.request({
            hostname: 'localhost', port: 4000, path: path, method: 'GET',
            headers: { 'Authorization': 'Bearer ' + token }
        }, res => {
            let body = '';
            res.on('data', d => body += d);
            res.on('end', () => {
                try {
                    resolve({ status: res.statusCode, data: JSON.parse(body || '{}') });
                } catch (e) {
                    resolve({ status: res.statusCode, data: body });
                }
            });
        });
        req.on('error', reject);
        req.end();
    });
}

async function run() {
    try {
        const login = await post('/auth/login', { email: 'John.Minoza@flatworldsolutions.com.ph', password: 'newpassword' });
        if (!login.data.accessToken) {
            console.log('Login failed, assuming user is already locked out or password is changed. Using direct token if possible.');
        }
        const token = login.data.accessToken || 'invalid';

        // Fallback: If login fails, let's just make the request without token to see if it even reaches the route
        const u = await getUrl('/users', token);
        console.log('Users:', u.status, typeof u.data === 'string' ? u.data.substring(0, 100) : JSON.stringify(u.data).substring(0, 100));

        const c = await getUrl('/campaigns', token);
        console.log('Campaigns:', c.status, typeof c.data === 'string' ? c.data.substring(0, 100) : JSON.stringify(c.data).substring(0, 100));

        const r = await getUrl('/users/config/roles', token);
        console.log('Roles:', r.status, typeof r.data === 'string' ? r.data.substring(0, 100) : JSON.stringify(r.data).substring(0, 100));
    } catch (e) { console.error('Error', e); }
}

run();
