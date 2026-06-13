import cron from "node-cron";
import { CampaignModel } from "./campaign.model";

/**
 * Deactivates all campaigns whose endDate has passed.
 * Called on server startup and then every 24 hours at midnight.
 */
const runExpiryCheck = async () => {
    try {
        const now = new Date();

        const result = await CampaignModel.updateMany(
            {
                isActive: true,
                isDeleted: false,
                endDate: { $lt: now },
            },
            {
                $set: { isActive: false },
            },
        );

        if (result.modifiedCount > 0) {
            console.log(`[CampaignJob] Deactivated ${result.modifiedCount} expired campaign(s) at ${now.toISOString()}`);
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

    // Then run every day at midnight
    cron.schedule("0 0 * * *", runExpiryCheck);

    console.log("[CampaignJob] Campaign expiry cron job scheduled (runs daily at midnight).");
};

