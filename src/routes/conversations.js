const express = require('express');
const { userAuth } = require('../middlewares/auth');
const Conversation = require('../models/conversation');
const { getOrCreateDirectConversation } = require('../utils/socket');

const router = express.Router();

// GET /conversations/direct?withUserId=:id — get or create direct conversation with that user
router.get('/conversations/direct', userAuth, async (req, res) => {
    try {
        const me = req.user._id;
        const withUserId = req.query.withUserId;
        if (!withUserId) {
            return res.status(400).json({ message: 'withUserId is required' });
        }
        if (String(withUserId) === String(me)) {
            return res.status(400).json({ message: 'Cannot create conversation with yourself' });
        }
        const conversation = await getOrCreateDirectConversation(me, withUserId);
        res.json({
            conversation: {
                _id: conversation._id,
                type: conversation.type,
                participants: conversation.participants,
                name: conversation.name,
                createdAt: conversation.createdAt,
            },
        });
    } catch (error) {
        console.error('GET /conversations/direct error:', error);
        res.status(500).json({ message: 'Failed to get conversation' });
    }
});

module.exports = router;
