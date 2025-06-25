import fetch from 'node-fetch';

async function testGuestLogin() {
    try {
        console.log('Testing guest login...');

        const response = await fetch('http://localhost:3001/api/auth/guest', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            }
        });

        console.log('Response status:', response.status);
        console.log('Response headers:', response.headers.raw());

        const data = await response.text();
        console.log('Response body:', data);

        if (response.ok) {
            const jsonData = JSON.parse(data);
            console.log('Parsed JSON:', jsonData);
        }
    } catch (error) {
        console.error('Test error:', error);
    }
}

testGuestLogin(); 