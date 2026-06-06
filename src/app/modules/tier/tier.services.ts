import httpStatus from "http-status";
import { Types } from "mongoose";
import ApiError from "../../../errors/ApiError";
import { TierModel } from "./tier.model";

const createTier = async (userId: string, payload: any) => {
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
