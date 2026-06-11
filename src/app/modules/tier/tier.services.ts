import httpStatus from "http-status";
import { Types } from "mongoose";
import ApiError from "../../../errors/ApiError";
import { TierModel } from "./tier.model";

/**
 * Checks if the given min/max range overlaps with any existing tier.
 * @param min - minSalesVolume of the new/updated tier
 * @param max - maxSalesVolume of the new/updated tier (optional / unlimited)
 * @param excludeTierId - tier ID to exclude from the check (used during update)
 */
const checkRangeOverlap = async (
    min: number,
    max: number | undefined | null,
    excludeTierId?: string,
) => {
    // Basic validation: min must be less than max (when max is provided)
    if (max !== undefined && max !== null && min >= max) {
        throw new ApiError(
            httpStatus.BAD_REQUEST,
            "minSalesVolume must be less than maxSalesVolume",
        );
    }

    const filter: any = { isDeleted: false };
    if (excludeTierId) {
        filter._id = { $ne: new Types.ObjectId(excludeTierId) };
    }

    const existingTiers = await TierModel.find(filter);

    for (const tier of existingTiers) {
        const existingMin = tier.minSalesVolume;
        const existingMax = tier.maxSalesVolume; // may be undefined (unlimited)

        // Two ranges [min, max] and [existingMin, existingMax] overlap when:
        //   newMin <= existingMax  AND  newMax >= existingMin
        // Treat undefined max as Infinity (unlimited upper bound).
        const newMax = max ?? Infinity;
        const tierMax = existingMax ?? Infinity;

        if (min < tierMax && newMax > existingMin) {
            throw new ApiError(
                httpStatus.CONFLICT,
                `Sales volume range ${min}–${max ?? "∞"} overlaps with existing tier "${tier.name}" (${existingMin}–${existingMax ?? "∞"})`,
            );
        }
    }
};

const createTier = async (userId: string, payload: any) => {
    await checkRangeOverlap(payload.minSalesVolume, payload.maxSalesVolume);

    const tier = await TierModel.create({
        ...payload,
        createdBy: new Types.ObjectId(userId),
    });
    return tier;
};

const getAllTiers = async (query: any = {}) => {
    const filter: any = { isDeleted: false };
    if (query.isActive !== undefined) filter.isActive = query.isActive === "true";

    const tiers = await TierModel.find(filter).sort({ minSalesVolume: 1 });
    return tiers;
};

const getActiveTiers = async () => {
    const filter: any = { isActive: true, isDeleted: false };
    const tiers = await TierModel.find(filter).sort({ minSalesVolume: 1 });
    return tiers;
};

const getTierById = async (tierId: string) => {
    const tier = await TierModel.findOne({ _id: tierId, isDeleted: false });
    if (!tier) throw new ApiError(httpStatus.NOT_FOUND, "Tier not found");
    return tier;
};

const updateTier = async (tierId: string, payload: any) => {
    // If min or max is being updated, validate the new range
    if (payload.minSalesVolume !== undefined || payload.maxSalesVolume !== undefined) {
        // Fetch current tier to merge with incoming changes
        const currentTier = await TierModel.findOne({ _id: tierId, isDeleted: false });
        if (!currentTier) throw new ApiError(httpStatus.NOT_FOUND, "Tier not found");

        const newMin = payload.minSalesVolume ?? currentTier.minSalesVolume;
        const newMax = payload.maxSalesVolume !== undefined
            ? payload.maxSalesVolume
            : currentTier.maxSalesVolume;

        await checkRangeOverlap(newMin, newMax, tierId);
    }

    const tier = await TierModel.findOneAndUpdate(
        { _id: tierId, isDeleted: false },
        { $set: payload },
        { returnDocument: "after", runValidators: true },
    );
    if (!tier) throw new ApiError(httpStatus.NOT_FOUND, "Tier not found");
    return tier;
};

const toggleTierStatus = async (tierId: string) => {
    const tier = await TierModel.findOne({ _id: tierId, isDeleted: false });
    if (!tier) throw new ApiError(httpStatus.NOT_FOUND, "Tier not found");
    tier.isActive = !tier.isActive;
    await tier.save();
    return tier;
};

const deleteTier = async (tierId: string) => {
    const tier = await TierModel.findOneAndUpdate(
        { _id: tierId, isDeleted: false },
        { $set: { isDeleted: true, isActive: false } },
        { returnDocument: "after" },
    );
    if (!tier) throw new ApiError(httpStatus.NOT_FOUND, "Tier not found");
    return tier;
};

export const tierServices = {
    createTier,
    getAllTiers,
    getActiveTiers,
    getTierById,
    updateTier,
    toggleTierStatus,
    deleteTier,
};
