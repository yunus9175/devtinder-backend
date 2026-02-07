const express = require('express');
const router = express.Router();
const Razorpay = require('../utils/razorpay');
const Payment = require('../models/razorPay');
const { userAuth } = require('../middlewares/auth');
const { membershipAmount } = require('../utils/constants');

// Route to create a new payment order
router.post('/create-order', userAuth, async (req, res) => {
    const userId = req.user._id;
    const membershipType = req.body.membershipType;

    try {
        const amountInRupees = membershipAmount[membershipType];
        if (amountInRupees == null || amountInRupees <= 0) {
            return res.status(400).json({
                error: 'No payment required for your current plan',
                message: membershipType === 'basic' ? 'Basic membership has no payment. Upgrade to standard or premium to pay.' : 'Invalid membership type for payment.'
            });
        }
        const amountInPaise = Math.round(amountInRupees * 100);

        // Create a new order in Razorpay
        const options = {
            amount: amountInPaise,
            currency: 'INR',
            receipt: `receipt_${Date.now()}`,
            notes: {
                "firstName": req.user.firstName,
                "lastName": req.user.lastName,
            }
        };
        const order = await Razorpay.orders.create(options);
        // Save the order details in the database
        const payment = new Payment({
            orderId: order.id,
            userId,
            amount: amountInRupees,
            currency: order.currency,
            notes: {
                firstName: order?.notes?.firstName || "",
                lastName: order?.notes?.lastName || "",
                membershipType
            },
            status: order.status
        });
        await payment.save();

        res.json({
            order,
            keyId: process.env.TEST_KEY_ID
        });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ error: 'Failed to create order' });
    }
});

module.exports = router;