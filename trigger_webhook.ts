
import crypto from 'crypto';
import https from 'https';

const secret = 'whsec_ktxmZrHlVrf2Trwywy9O0hTbsBnqOjRV';
const userId = '9a959bd2-8679-495c-971d-e955c7acf226'; // tha@123.com
const endpoint = 'https://fjiurznodfyhxzmqnkcc.supabase.co/functions/v1/stripe-webhook';

const payload = JSON.stringify({
    type: 'checkout.session.completed',
    data: {
        object: {
            client_reference_id: userId,
            subscription: 'sub_fake_godmode',
            customer: 'cus_fake_godmode',
            customer_email: 'tha@123.com'
        }
    }
});

const timestamp = Math.floor(Date.now() / 1000);
const signaturePayload = `${timestamp}.${payload}`;
const signature = crypto
    .createHmac('sha256', secret)
    .update(signaturePayload)
    .digest('hex');

const sigHeader = `t=${timestamp},v1=${signature}`;

console.log(`Sending webhook to ${endpoint}...`);

const req = https.request(endpoint, {
    method: 'POST',
    headers: {
        'Content-Type': 'application/json',
        'Stripe-Signature': sigHeader,
        'Content-Length': Buffer.byteLength(payload)
    }
}, (res) => {
    console.log(`Status: ${res.statusCode}`);
    res.on('data', (d) => process.stdout.write(d));
});

req.on('error', (e) => {
    console.error(e);
});

req.write(payload);
req.end();
