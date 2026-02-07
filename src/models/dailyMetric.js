const { Schema, model } = require('mongoose');

const dailyMetricSchema = new Schema({
    // ISO date string (YYYY-MM-DD) for the day these metrics represent
    date: { type: String, required: true, unique: true, index: true },
    newUsers: { type: Number, default: 0 },
    newRequests: { type: Number, default: 0 },
    acceptedRequests: { type: Number, default: 0 },
    // when the document was recorded
    recordedAt: { type: Date, default: () => new Date() }
});

const DailyMetric = model('DailyMetric', dailyMetricSchema);
module.exports = DailyMetric;
