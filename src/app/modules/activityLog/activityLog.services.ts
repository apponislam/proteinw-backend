import { Types } from "mongoose";
import { getSocket } from "../../socket/socket";
import { ActivityLogModel } from "./activityLog.model";

const createActivityLog = async (payload: { groupId: Types.ObjectId; type: "SALE" | "MILESTONE" | "MEMBER" | "CAMPAIGN"; title: string; description: string }) => {
    const activity = await ActivityLogModel.create(payload);
    
    // Emit socket event safely
    try {
        const io = getSocket();
        io.emit("activity:new", activity);
        console.log("🔌 Emitted activity:new event:", activity.title);
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
    const limit = parseInt(query.limit as string) || 20;
    const activities = await ActivityLogModel.find(filter).sort({ createdAt: -1 }).limit(limit);
    return activities;
};

export const activityLogServices = {
    createActivityLog,
    getAllActivities,
};
