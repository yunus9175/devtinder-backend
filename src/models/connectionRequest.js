const { Schema, model } = require('mongoose')

const connectionRequestSchema = new Schema({
    fromUserId: {
        type: Schema.Types.ObjectId,
        required: true
    },
    toUserId: {
        type: Schema.Types.ObjectId,
        required: true
    },
    status: {
        type: String,
        required: true,
        enum: {
            values: ["ignored", "interested", "accepted", "rejected"],
            message: "{VALUE} is not valid status."
        }
    }

}, {
    timestamps: true
})
connectionRequestSchema.index({ fromUserId: 1, toUserId: 1 })
connectionRequestSchema.pre("save", async function () {
    const connectionRequest = this;
    // Check if the fromUserId is same as toUserId
    if (connectionRequest.fromUserId.equals(connectionRequest.toUserId)) {
        throw new Error("Cannot send connection request to yourself!");
    }
});
const ConnectionRequest = model(
    "ConnectionRequest", connectionRequestSchema
)
module.exports = ConnectionRequest