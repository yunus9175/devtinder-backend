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
    // For direct only: sorted participant ids joined, e.g. "id1_id2". Ensures one conversation per pair.
    participantKey: {
        type: String,
        default: null,
        sparse: true,
    },
    name: {
        type: String,
        default: null,
        trim: true,
    },
}, {
    timestamps: true,
});

// Unique per direct pair (participantKey = "smallerId_largerId"). Sparse so group convos (null key) don't conflict.
conversationSchema.index({ type: 1, participantKey: 1 }, { unique: true, sparse: true });
conversationSchema.index({ participants: 1, updatedAt: -1 });

const Conversation = model('Conversation', conversationSchema);
module.exports = Conversation;
