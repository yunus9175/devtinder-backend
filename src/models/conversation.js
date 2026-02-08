const { Schema, model } = require('mongoose');

const conversationSchema = new Schema({
    type: {
        type: String,
        enum: ['direct', 'group'],
        default: 'direct',
    },
    participants: [{
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    }],
    name: {
        type: String,
        default: null,
        trim: true,
    },
}, {
    timestamps: true,
});

// For direct: only one conversation per pair (order-independent)
conversationSchema.index({ type: 1, participants: 1 }, { unique: true });
conversationSchema.index({ participants: 1, updatedAt: -1 });

const Conversation = model('Conversation', conversationSchema);
module.exports = Conversation;
