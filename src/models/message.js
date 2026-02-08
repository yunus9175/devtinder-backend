const { Schema, model } = require('mongoose');

const messageSchema = new Schema({
    conversationId: {
        type: Schema.Types.ObjectId,
        ref: 'Conversation',
        required: true,
    },
    senderId: {
        type: Schema.Types.ObjectId,
        ref: 'User',
        required: true,
    },
    content: {
        type: String,
        required: true,
        trim: true,
        maxlength: 10000,
    },
    readBy: [{
        userId: { type: Schema.Types.ObjectId, ref: 'User' },
        readAt: { type: Date, default: Date.now },
    }],
}, {
    timestamps: true,
});

// Efficient queries: by conversation (history + pagination); for future "unread per user" you can add readBy index
messageSchema.index({ conversationId: 1, createdAt: -1 });

const Message = model('Message', messageSchema);
module.exports = Message;
