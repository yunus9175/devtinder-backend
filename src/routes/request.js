const express = require('express')
const { userAuth } = require("../middlewares/auth");
const ConnectionRequest = require('../models/connectionRequest');
const User = require('../models/user');
const router = express.Router()
// Send connection request (protected: requires login; uses req.user from userAuth)
router.post("/request/send/:status/:toUserId", userAuth, async (req, res) => {
    try {
        const { toUserId, status } = req.params
        const { _id: fromUserId } = req.user;
        //allowed statuses
        const ALLOWED_STATUS = ["ignored", "interested"]
        if (!ALLOWED_STATUS.includes(status)) {
            return res.status(400).json({ message: "Invalid status type: " + status })
        }

        //If there is an existing ConnectionRequest

        // if recever and sender are same and sender and reciever are same show error
        const existingConnectionRequest = await ConnectionRequest.findOne({
            $or: [
                {
                    fromUserId, toUserId
                }, {
                    fromUserId: toUserId, toUserId: fromUserId
                }
            ]
        })
        if (existingConnectionRequest) {
            return res.status(400).json({ message: "Connection already Exist!" })
        }
        // check is reciever exist inDB or not
        const recieverUser = await User.findOne({ _id: toUserId });
        if (!recieverUser) {
            return res.status(400).json({ message: "User not found!" })
        }
        //create instance before save in db
        const connectRequest = new ConnectionRequest({
            fromUserId, toUserId, status
        })
        // Save connection in MongoDB
        await connectRequest.save();

        // Dynamic message based on status, including sender and receiver first names
        const senderName = req.user.firstName;
        const receiverName = recieverUser.firstName;
        const statusMessages = {
            interested: `${senderName} has expressed interest in connecting with ${receiverName}!`,
            ignored: `${senderName} has marked the connection with ${receiverName} as ignored.`,
        };
        const message = statusMessages[status] || `${senderName} sent a connection request to ${receiverName} (status: ${status}).`;

        res.status(200).json({ message, data: connectRequest });
    } catch (error) {
        // 11000 is the MongoDB code for "Duplicate Key Error"
        if (error.code === 11000) {
            return res.status(400).json({
                status: 'Error',
                message: 'The request connection is already exist.'
            });
        }
        res.status(500).json({ message: "Error", error: error.message });
    }
});
module.exports = router