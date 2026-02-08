const express = require('express');
const { userAuth } = require('../middlewares/auth');
const Message = require('../models/message');
const Conversation = require('../models/conversation');
const { getOrCreateDirectConversation } = require('../utils/socket');

const router = express.Router();

// Resolve conversation: from conversationId or from withUserId (direct)
async function resolveConversation(me, conversationId, withUserId) {
    if (conversationId) {
        const conv = await Conversation.findById(conversationId);
        if (!conv || !conv.participants.some(p => p.toString() === String(me))) return null;
        return conv;
    }
    if (withUserId) {
        const conv = await getOrCreateDirectConversation(me, withUserId);
        return conv;
    }
    return null;
}

// GET /messages?conversationId=:id OR ?withUserId=:id — limit=20&before=:messageId for pagination
router.get('/messages', userAuth, async (req, res) => {
    try {
        const me = req.user._id;
        const conversationId = req.query.conversationId;
        const withUserId = req.query.withUserId;
        const conv = await resolveConversation(me, conversationId, withUserId);
        if (!conv) {
            return res.status(400).json({ message: 'conversationId or withUserId is required and you must be a participant' });
        }

        const limit = Math.min(Number(req.query.limit) || 50, 100);
        const beforeId = req.query.before || null;

        const filter = { conversationId: conv._id };
        if (beforeId) {
            const beforeDoc = await Message.findOne({
                _id: beforeId,
                conversationId: conv._id,
            }).select('createdAt').lean();
            if (beforeDoc) {
                filter.createdAt = { $lt: beforeDoc.createdAt };
            }
        }

        const messages = await Message.find(filter)
            .sort({ createdAt: 1 })
            .limit(limit)
            .select('_id conversationId senderId content readBy createdAt')
            .lean();

        res.json({ messages });
    } catch (error) {
        console.error('GET /messages error:', error);
        res.status(500).json({ message: 'Failed to fetch messages' });
    }
});

// PATCH /messages/:messageId/read — mark as read (add current user to readBy)
router.patch('/messages/:messageId/read', userAuth, async (req, res) => {
    try {
        const { messageId } = req.params;
        const me = req.user._id;
        const msg = await Message.findById(messageId);
        if (!msg) {
            return res.status(404).json({ message: 'Message not found' });
        }
        const conv = await Conversation.findById(msg.conversationId);
        if (!conv || !conv.participants.some(p => p.toString() === String(me))) {
            return res.status(403).json({ message: 'Not a participant in this conversation' });
        }
        const alreadyRead = msg.readBy?.some(r => r.userId.toString() === String(me));
        if (!alreadyRead) {
            msg.readBy = msg.readBy || [];
            msg.readBy.push({ userId: me, readAt: new Date() });
            await msg.save();
        }
        res.json({ message: 'Marked as read', readBy: msg.readBy });
    } catch (error) {
        console.error('PATCH /messages/:id/read error:', error);
        res.status(500).json({ message: 'Failed to update message' });
    }
});

module.exports = router;
