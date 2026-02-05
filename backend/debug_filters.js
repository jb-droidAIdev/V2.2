async function test() {
    try {
        const loginRes = await fetch('http://localhost:4000/auth/login', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ email: 'admin@example.com', password: 'password123' })
        });
        const { access_token } = await loginRes.json();
        const filterRes = await fetch('http://localhost:4000/dashboard/filters', {
            headers: { Authorization: `Bearer ${access_token}` }
        });
        const filters = await filterRes.json();
        console.log('Campaigns in dynamic filter:', filters.campaigns.length);
        console.log('Sample Campaign:', filters.campaigns[0]);

        const campaignsTotal = await fetch('http://localhost:4000/campaigns', {
            headers: { Authorization: `Bearer ${access_token}` }
        });
        const cAll = await campaignsTotal.json();
        console.log('Total Campaigns from /campaigns:', cAll.length);
    } catch (e) {
        console.error(e);
    }
}
test();
