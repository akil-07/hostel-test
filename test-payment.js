// Test PhonePe Payment Endpoint
const testPayment = async () => {
    try {
        const response = await fetch('http://localhost:5000/api/pay', {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Origin': 'http://localhost:5173'
            },
            body: JSON.stringify({
                amount: 100,
                userId: 'test_user_123',
                orderId: 'TEST_ORDER_' + Date.now()
            })
        });

        const data = await response.json();
        console.log('Response Status:', response.status);
        console.log('Response Data:', JSON.stringify(data, null, 2));

        if (data.url) {
            console.log('\n✅ SUCCESS! Payment URL received');
            console.log('Redirect URL:', data.url);
        } else if (data.error) {
            console.log('\n❌ ERROR:', data.error);
            if (data.details) {
                console.log('Details:', JSON.stringify(data.details, null, 2));
            }
        }
    } catch (error) {
        console.error('❌ Request failed:', error.message);
    }
};

testPayment();
