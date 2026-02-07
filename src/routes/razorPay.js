const express = require('express');
const router = express.Router();
const Razorpay = require('../utils/razorpay');
const Payment = require('../models/razorPay');
const User = require('../models/user');
const { userAuth } = require('../middlewares/auth');
const { membershipAmount, membershipDurationDays } = require('../utils/constants');
const { validateWebhookSignature } = require('razorpay/dist/utils/razorpay-utils');

// Route to create a new payment order
router.post('/payment/create', userAuth, async (req, res) => {
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

        res.status(200).json({
            message: 'Order created successfully',
            order,
            keyId: process.env.RAZORPAY_KEY_ID
        });
    } catch (error) {
        console.error('Error creating order:', error);
        res.status(500).json({ error: 'Failed to create order', message: error.message });
    }
});

// Webhook handler: must receive raw body (Buffer) for signature verification.
// Mount in app.js with express.raw({ type: 'application/json' }) before express.json().
router.post('/payment/webhook', async (req, res) => {
    const signature = req.headers['x-razorpay-signature'];
    const secret = process.env.RAZORPAY_WEBHOOK_SECRET;
    console.log({ signature, secret });
    if (!signature || !secret) {
        return res.status(400).json({ error: 'Missing signature or webhook secret' });
    }
    console.log("body", req.body);

    const rawBody = JSON.stringify(req.body);
    if (!rawBody) {
        return res.status(400).json({ error: 'Missing webhook body' });
    }
    console.log("rawBody", rawBody);
    try {
        validateWebhookSignature(rawBody, signature, secret);
    } catch (error) {
        console.error('Webhook signature verification failed:', error?.message);
        return res.status(401).json({ error: 'Invalid webhook signature' });
    }

    let payload;
    try {
        payload = JSON.parse(rawBody);
    } catch (e) {
        console.log({ e });
        return res.status(400).json({ error: 'Invalid JSON body' });
    }
    console.log({ payload });
    const event = payload.event;
    const paymentEntity = payload.payload?.payment?.entity;
    console.log({ event, paymentEntity });
    try {
        if (event === 'payment.captured' && paymentEntity) {
            const updatedPayment = await Payment.findOneAndUpdate(
                { orderId: paymentEntity.order_id },
                { status: 'paid' },
                { new: true }
            );
            if (updatedPayment?.userId && updatedPayment?.notes?.membershipType) {
                const membershipType = updatedPayment.notes.membershipType;
                const days = membershipDurationDays[membershipType] ?? 30;
                const membershipExpiry = new Date();
                membershipExpiry.setDate(membershipExpiry.getDate() + days);
                await User.findByIdAndUpdate(updatedPayment.userId, {
                    membershipType,
                    isPremium: true,
                    membershipExpiry
                });
            }
        }
        res.status(200).json({ received: true });
    } catch (err) {
        console.error('Webhook processing error:', err);
        res.status(500).json({ error: 'Webhook processing failed' });
    }
});

module.exports = router;