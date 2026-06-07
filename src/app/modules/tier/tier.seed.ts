import { TierModel } from "./tier.model";

export const seedTiers = async () => {
    try {
        // Check if tiers already exist
        const existingTiers = await TierModel.countDocuments({ isDeleted: false });

        if (existingTiers > 0) {
            console.log("✅ Tiers already exist, skipping seed.");
            return;
        }

        // Define the tiers
        const tiers = [
            {
                name: "STANDARD ENTRY",
                percentage: 40,
                minSalesVolume: 0,
                maxSalesVolume: 149,
                isPopular: false,
                isActive: true,
                isDeleted: false,
            },
            {
                name: "GROWTH ACCELERATOR",
                percentage: 45,
                minSalesVolume: 150,
                maxSalesVolume: 224,
                isPopular: true,
                isActive: true,
                isDeleted: false,
            },
            {
                name: "ELITE PERFORMANCE",
                percentage: 50,
                minSalesVolume: 225,
                isPopular: false,
                isActive: true,
                isDeleted: false,
            },
        ];

        // Create all tiers
        await TierModel.create(tiers);
        console.log("✅ Successfully seeded 3 default tiers!");
    } catch (error) {
        console.error("Error seeding tiers:", error);
    }
};
