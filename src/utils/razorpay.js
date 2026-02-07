const Razorpay = require('razorpay');

const keyId = process.env.TEST_KEY_ID;
const keySecret = process.env.TEST_KEY_SECRET;

if (!keyId || !keySecret) {
    throw new Error('Razorpay credentials missing: set TEST_KEY_ID and TEST_KEY_SECRET in environment');
}

const instance = new Razorpay({
    key_id: keyId,
    key_secret: keySecret,
});

module.exports = instance;