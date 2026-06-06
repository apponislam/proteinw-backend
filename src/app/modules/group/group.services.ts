import httpStatus from "http-status";
import { Types } from "mongoose";
import ApiError from "../../../errors/ApiError";
import { GroupModel } from "./group.model";

const createGroup = async (userId: string, payload: any) => {
    const group = await GroupModel.create({
        ...payload,
        createdBy: new Types.ObjectId(userId),
    });
    return group;
};

const getAllGroups = async (query: any = {}) => {
    const filter: any = { isDeleted: false };
    if (query.isActive !== undefined) filter.isActive = query.isActive === "true";

    const page = parseInt(query.page as string) || 1;
    const limit = parseInt(query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const groups = await GroupModel.find(filter).sort({ createdAt: -1 }).skip(skip).limit(limit);
    const total = await GroupModel.countDocuments(filter);

    return {
        data: groups,
        pagination: {
            page,
            limit,
            total,
            totalPages: Math.ceil(total / limit),
            hasNext: page < Math.ceil(total / limit),
            hasPrev: page > 1,
        },
    };
};

const getActiveGroups = async () => {
    const groups = await GroupModel.find({ isActive: true, isDeleted: false }).sort({ endDate: 1, createdAt: -1 });
    return groups;
};

const getGroupById = async (groupId: string) => {
    const group = await GroupModel.findOne({ _id: groupId, isDeleted: false });
    if (!group) throw new ApiError(httpStatus.NOT_FOUND, "Group not found");
    return group;
};

const updateGroup = async (groupId: string, payload: any) => {
    const group = await GroupModel.findOneAndUpdate({ _id: groupId, isDeleted: false }, { $set: payload }, { returnDocument: "after", runValidators: true });
    if (!group) throw new ApiError(httpStatus.NOT_FOUND, "Group not found");
    return group;
};

const toggleGroupStatus = async (groupId: string) => {
    const group = await GroupModel.findOne({ _id: groupId, isDeleted: false });
    if (!group) throw new ApiError(httpStatus.NOT_FOUND, "Group not found");
    group.isActive = !group.isActive;
    await group.save();
    return group;
};

const deleteGroup = async (groupId: string) => {
    const group = await GroupModel.findOneAndUpdate({ _id: groupId, isDeleted: false }, { $set: { isDeleted: true, isActive: false } }, { returnDocument: "after" });
    if (!group) throw new ApiError(httpStatus.NOT_FOUND, "Group not found");
    return group;
};

export const groupServices = {
    createGroup,
    getAllGroups,
    getActiveGroups,
    getGroupById,
    updateGroup,
    toggleGroupStatus,
    deleteGroup,
};
