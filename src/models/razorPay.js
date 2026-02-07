const { Schema, model } = require('mongoose');

const paymentSchema = new Schema({
    paymentId: { type: String },
    orderId: { type: String, required: true },
    userId: { type: Schema.Types.ObjectId, ref: 'User', required: true },
    amount: { type: Number, required: true },
    currency: { type: String, default: 'INR' },
    notes: {
        firstName: { type: String },
        lastName: { type: String },
        membershipType: { type: String }
    },
    status: { type: String, enum: ['created', 'paid', 'failed'], default: 'created' },
    createdAt: { type: Date, default: Date.now }
});

module.exports = model('Payment', paymentSchema);