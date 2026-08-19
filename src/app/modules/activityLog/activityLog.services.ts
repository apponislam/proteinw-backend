import { Types } from "mongoose";
import { getSocket } from "../../socket/socket";
import { ActivityLogModel } from "./activityLog.model";

const createActivityLog = async (payload: { groupId: Types.ObjectId; type: "SALE" | "MILESTONE" | "MEMBER" | "CAMPAIGN"; title: string; description: string }) => {
    const activity = await ActivityLogModel.create(payload);
    
    // Emit socket event safely
    try {
        const io = getSocket();
        io.to(`group_${payload.groupId.toString()}`).emit("activity:new", activity);
        console.log("🔌 Emitted activity:new event to room:", `group_${payload.groupId.toString()}`, activity.title);
    } catch (error) {
        console.error("Failed to emit socket event for activity log:", error);
    }

    return activity;
};

const getAllActivities = async (user: any, query: any = {}) => {
    const filter: any = {};

    if (query.groupId) {
        filter.groupId = new Types.ObjectId(query.groupId);
    } else if (user?.role === "SELLER") {
        const { SellerGroupModel } = await import("../sellerGroup/sellerGroup.model");
        const sellerGroups = await SellerGroupModel.find({ sellerId: user._id, isDeleted: false }).select("groupId").lean();
        const groupIds = sellerGroups.map((sg) => sg.groupId).filter(Boolean);

        if (groupIds.length === 0) {
            return {
                data: [],
                pagination: { page: 1, limit: 10, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
            };
        }
        filter.groupId = { $in: groupIds };
    } else if (user?.role === "ADMIN") {
        const { GroupModel } = await import("../group/group.model");
        const adminGroups = await GroupModel.find({ createdBy: user._id, isDeleted: false }).select("_id").lean();
        const groupIds = adminGroups.map((g) => g._id);

        if (groupIds.length === 0) {
            return {
                data: [],
                pagination: { page: 1, limit: 10, total: 0, totalPages: 0, hasNext: false, hasPrev: false },
            };
        }
        filter.groupId = { $in: groupIds };
    }

    const page = parseInt(query.page as string) || 1;
    const limit = parseInt(query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const [activities, total] = await Promise.all([
        ActivityLogModel.find(filter)
            .sort({ createdAt: -1 })
            .skip(skip)
            .limit(limit)
            .lean(),
        ActivityLogModel.countDocuments(filter),
    ]);

    return {
        data: activities,
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

export const activityLogServices = {
    createActivityLog,
    getAllActivities,
};
