const axios = require('axios');

async function testLogin() {
    try {
        const response = await axios.post('http://localhost:4000/auth/login', {
            email: 'admin@flatworld.ph',
            password: 'Admin@123'
        });
        console.log('Login Success!');
        console.log('User:', response.data.user.email);
        console.log('Token:', response.data.access_token.substring(0, 20) + '...');
    } catch (error) {
        console.log('Login Failed:', error.response?.status, error.response?.data);
    }
}

testLogin();
