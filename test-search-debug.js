const fetch = require('node-fetch');

async function testSearch() {
    try {
        console.log('Testing search endpoint...');

        const response = await fetch('http://localhost:3001/api/search?query=chicken', {
            method: 'GET',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', Object.fromEntries(response.headers.entries()));

        const text = await response.text();
        console.log('Raw response:', text);

        try {
            const json = JSON.parse(text);
            console.log('Parsed JSON:', JSON.stringify(json, null, 2));
        } catch (e) {
            console.log('Failed to parse as JSON:', e.message);
        }

    } catch (error) {
        console.error('Request failed:', error);
    }
}

testSearch(); 