import cron from "node-cron";
import { CampaignModel } from "./campaign.model";

/**
 * Deactivates all campaigns whose endDate has passed.
 * Called on server startup and then runs every hour.
 */
export const runExpiryCheck = async () => {
    try {
        const now = new Date();

        // 1. Log any active campaigns to inspect their endDate vs now
        const activeCampaigns = await CampaignModel.find({
            status: "ACTIVE",
            isDeleted: false,
        }).select("_id name status endDate");

        if (activeCampaigns.length > 0) {
            console.log(`[CampaignJob] Active campaigns check at ${now.toISOString()}:`, activeCampaigns.map(c => ({
                id: c._id,
                name: c.name,
                endDate: c.endDate ? c.endDate.toISOString() : null,
                isExpired: c.endDate ? c.endDate < now : false,
            })));
        }

        // 2. Perform update for all expired active campaigns
        const result = await CampaignModel.updateMany(
            {
                status: "ACTIVE",
                isDeleted: false,
                endDate: { $lt: now },
            },
            {
                $set: { status: "FULFILMENT" },
            },
        );

        if (result.modifiedCount > 0) {
            console.log(`[CampaignJob] Deactivated ${result.modifiedCount} expired campaign(s) to FULFILMENT at ${now.toISOString()}`);
        } else {
            console.log(`[CampaignJob] No expired campaigns found at ${now.toISOString()}`);
        }
    } catch (error) {
        console.error("[CampaignJob] Error running campaign expiry check:", error);
    }
};

export const startCampaignExpiryJob = () => {
    // Run immediately on server start to catch anything that expired while server was down
    runExpiryCheck();

    // Run every hour at minute 0
    cron.schedule("0 * * * *", runExpiryCheck);

    console.log("[CampaignJob] Campaign expiry cron job scheduled (runs hourly).");
};


