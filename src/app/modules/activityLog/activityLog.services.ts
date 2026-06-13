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

const getAllActivities = async (query: any = {}) => {
    const filter: any = {};
    if (query.groupId) {
        filter.groupId = new Types.ObjectId(query.groupId);
    }
    
    const page = parseInt(query.page as string) || 1;
    const limit = parseInt(query.limit as string) || 10;
    const skip = (page - 1) * limit;

    const activities = await ActivityLogModel.find(filter)
        .sort({ createdAt: -1 })
        .skip(skip)
        .limit(limit);

    const total = await ActivityLogModel.countDocuments(filter);

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
