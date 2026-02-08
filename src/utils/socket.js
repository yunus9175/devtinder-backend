// Socket.IO events aligned with frontend:
// Frontend emit → Backend: registerPresence({ userId }), joinChat({ conversationId } or { userId, targetUserId }), sendMessage(...), leaveChat(...), typing(...), stopTyping(...)
// Backend emit → Frontend: userOnline({ userId }), userOffline({ userId }), receiveMessage(message), userTyping({ userId }), userStoppedTyping({ userId })
// Room ID = conversationId (string). For 1:1, get or create direct conversation and use its _id so future group chats use the same pattern.

const socket = require('socket.io');
const mongoose = require('mongoose');
const Message = require('../models/message');
const Conversation = require('../models/conversation');

function getDirectParticipantKey(userId, targetUserId) {
    const a = String(userId);
    const b = String(targetUserId);
    return [a, b].sort((x, y) => x.localeCompare(y)).join('_');
}

async function getOrCreateDirectConversation(userId, targetUserId) {
    const a = new mongoose.Types.ObjectId(userId);
    const b = new mongoose.Types.ObjectId(targetUserId);
    const participants = [a, b].sort((x, y) => x.toString().localeCompare(y.toString()));
    const participantKey = getDirectParticipantKey(userId, targetUserId);
    let conv = await Conversation.findOne({ type: 'direct', participantKey });
    if (!conv) {
        conv = await Conversation.create({ type: 'direct', participants, participantKey });
    }
    return conv;
}

const initializeSocket = (server, { corsOrigin, basePath = '' }) => {
    const normalizedBase = (basePath && basePath !== '/') ? basePath.replace(/\/$/, '') : '';
    const socketPath = normalizedBase ? `${normalizedBase}/socket.io` : '/socket.io';
    console.log("socketPath", socketPath);
    console.log("corsOrigin", corsOrigin);
    console.log("basePath", basePath);
    console.log("normalizedBase", normalizedBase);
    const io = socket(server, {
        cors: { origin: corsOrigin },
        path: socketPath,
    });
    io.on('connection', (socket) => {
        socket.on('registerPresence', (data) => {
            const userId = data?.userId;
            if (!userId) return;
            socket.userId = userId;
            io.emit('userOnline', { userId });
        });

        socket.on('joinChat', async (data) => {
            let roomId = data.roomId || data.conversationId;
            if (!roomId && data.userId && data.targetUserId) {
                try {
                    const conv = await getOrCreateDirectConversation(data.userId, data.targetUserId);
                    roomId = conv._id.toString();
                } catch (e) {
                    return;
                }
            }
            if (!roomId) return;
            socket.join(roomId);
        });

        socket.on('sendMessage', async (data) => {
            const senderId = data.senderId || socket.userId;
            const content = data.content?.trim();
            if (!senderId || !content) return;

            let conversationId = data.conversationId;
            if (!conversationId && data.userId && data.targetUserId) {
                try {
                    const conv = await getOrCreateDirectConversation(data.userId, data.targetUserId);
                    conversationId = conv._id;
                } catch (e) {
                    return;
                }
            }
            if (!conversationId) return;

            try {
                const conv = await Conversation.findById(conversationId);
                if (!conv || !conv.participants.some(p => p.toString() === String(senderId))) {
                    return;
                }
                const msg = await Message.create({
                    conversationId,
                    senderId,
                    content,
                });
                const roomId = conv._id.toString();
                const payload = {
                    _id: msg._id,
                    conversationId: msg.conversationId,
                    senderId: msg.senderId,
                    content: msg.content,
                    readBy: msg.readBy || [],
                    createdAt: msg.createdAt,
                };
                io.to(roomId).emit('receiveMessage', payload);
            } catch (err) {
                console.error('sendMessage save error:', err);
            }
        });

        socket.on('leaveChat', async (data) => {
            let roomId = data.roomId || data.conversationId;
            if (!roomId && data.userId && data.targetUserId) {
                try {
                    const conv = await getOrCreateDirectConversation(data.userId, data.targetUserId);
                    roomId = conv._id.toString();
                } catch (e) {
                    return;
                }
            }
            if (!roomId) return;
            socket.leave(roomId);
        });

        socket.on('typing', async (data) => {
            let roomId = data.roomId || data.conversationId;
            if (!roomId && data.userId && data.targetUserId) {
                try {
                    const conv = await getOrCreateDirectConversation(data.userId, data.targetUserId);
                    roomId = conv._id.toString();
                } catch (e) {
                    return;
                }
            }
            if (!roomId) return;
            socket.to(roomId).emit('userTyping', { userId: socket.userId });
        });

        socket.on('stopTyping', async (data) => {
            let roomId = data.roomId || data.conversationId;
            if (!roomId && data.userId && data.targetUserId) {
                try {
                    const conv = await getOrCreateDirectConversation(data.userId, data.targetUserId);
                    roomId = conv._id.toString();
                } catch (e) {
                    return;
                }
            }
            if (!roomId) return;
            socket.to(roomId).emit('userStoppedTyping', { userId: socket.userId });
        });

        socket.on('disconnect', () => {
            if (socket.userId) {
                io.emit('userOffline', { userId: socket.userId });
            }
        });
    });
};

module.exports = {
    initializeSocket,
    getOrCreateDirectConversation,
};
