const cron = require('node-cron');
const { startOfDay, endOfDay } = require('date-fns')
const ConnectionRequest = require("../models/connectionRequest");

// Default schedule behaviour:
// - In production (or when NODE_ENV !== 'development') the job runs daily at midnight.
//   Use the 5-field cron expression '0 0 * * *' (minute=0, hour=0) for midnight daily.
// - In development we default to a high-frequency schedule so it is easy to observe during testing.
// - You can override with CRON_SCHEDULE (supports 5- or 6-field expressions; 6-field allows seconds).

// Keep the existing high-frequency cleanup schedule (dev-friendly) or daily in prod


// --------------------------------------------------
// DAILY MIDNIGHT AGGREGATION (useful + safe)
// --------------------------------------------------
// Runs once per day at midnight (UTC) by default. Override with CRON_SCHEDULE_DAILY env var.
const dailySchedule = process.env.CRON_SCHEDULE_DAILY || '0 0 * * *';

/**
 * Aggregate daily metrics for the platform and persist them to `DailyMetric` (safe upsert).
 */
async function aggregateDailyMetrics(opts = { dryRun: true, forDate: null }) {
    const { dryRun = true, forDate = null } = opts || {};
    const day = forDate ? new Date(forDate) : new Date();
    const start = startOfDay(day);
    const end = endOfDay(day);

    console.log(`aggregateDailyMetrics: computing metrics for ${start.toISOString().slice(0, 10)} (dryRun=${dryRun})`);

    const [newUsers, newRequests, acceptedRequests] = await Promise.all([
        // createdAt is present via timestamps option on schemas
        require('../models/user').countDocuments({ createdAt: { $gte: start, $lte: end } }),
        ConnectionRequest.countDocuments({ createdAt: { $gte: start, $lte: end } }),
        ConnectionRequest.countDocuments({ status: 'accepted', updatedAt: { $gte: start, $lte: end } })
    ]);

    console.log(`aggregateDailyMetrics: newUsers=${newUsers} newRequests=${newRequests} acceptedRequests=${acceptedRequests}`);

    if (!dryRun) {
        const DailyMetric = require('../models/dailyMetric');
        const dateKey = start.toISOString().slice(0, 10);
        await DailyMetric.updateOne(
            { date: dateKey },
            { $set: { newUsers, newRequests, acceptedRequests, recordedAt: new Date() } },
            { upsert: true }
        );
        console.log('aggregateDailyMetrics: persisted to DailyMetric');
    }

    return { newUsers, newRequests, acceptedRequests };
}

// schedule daily aggregation at midnight (UTC)
cron.schedule(dailySchedule, async () => {
    console.log('Running daily aggregation job (midnight)...');
    try {
        await aggregateDailyMetrics({ dryRun: false });
        console.log('Daily aggregation job completed');
    } catch (err) {
        console.error('Daily aggregation job error:', err);
    }
});

// --------------------------------------------------
// WEEKLY SCHEDULE (runs once per week at midnight)
// --------------------------------------------------
// Default: Sunday 00:00 UTC. Override with CRON_SCHEDULE_WEEKLY (cron expression).
const weeklySchedule = process.env.CRON_SCHEDULE_WEEKLY || '0 0 * * 0';
cron.schedule(weeklySchedule, async () => {
    console.log('Running weekly aggregation/maintenance job (weekly midnight)...');
    try {
        // run a full conjon-style job: cleanup + aggregate metrics (non-dry run)
        await aggregateDailyMetrics({ dryRun: false });
        // (optional) add more weekly-only maintenance here in future
        console.log('Weekly aggregation/maintenance job completed');
    } catch (err) {
        console.error('Weekly aggregation job error:', err);
    }
});

// Expose helpers so you can run them manually from scripts or tests
module.exports.aggregateDailyMetrics = aggregateDailyMetrics;
module.exports.dailySchedule = dailySchedule;
module.exports.weeklySchedule = weeklySchedule;
module.exports.runWeekly = (opts = { dryRun: true }) => aggregateDailyMetrics({ dryRun: opts.dryRun, forDate: opts.forDate });