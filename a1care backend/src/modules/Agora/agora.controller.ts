import { RtcTokenBuilder, RtcRole } from 'agora-token';
import asyncHandler from "../../utils/asyncHandler.js";
import { ApiError } from "../../utils/ApiError.js";
import { ApiResponse } from "../../utils/ApiResponse.js";

/**
 * GET /api/agora/token
 * Query: channelName
 * Generates an Agora RTC token for the given channel.
 */
export const getAgoraToken = asyncHandler(async (req, res) => {
    const channelName = req.query.channelName as string;
    
    if (!channelName) {
        throw new ApiError(400, "channelName is required");
    }

    const appId = process.env.AGORA_APP_ID;
    const appCertificate = process.env.AGORA_APP_CERTIFICATE;

    if (!appId || !appCertificate) {
        console.error("Agora credentials missing in .env");
        throw new ApiError(500, "Video calling is not configured on the server yet.");
    }

    // Token valid for 2 hours
    const expirationTimeInSeconds = 3600 * 2;
    const currentTimestamp = Math.floor(Date.now() / 1000);
    const privilegeExpiredTs = currentTimestamp + expirationTimeInSeconds;

    // Numerical UID = 0 (means any UID is permitted)
    const uid = 0; 
    const role = RtcRole.PUBLISHER;

    const token = RtcTokenBuilder.buildTokenWithUid(
        appId,
        appCertificate,
        channelName,
        uid,
        role,
        privilegeExpiredTs,
        privilegeExpiredTs 
    );

    return res.status(200).json(
        new ApiResponse(200, "Agora token generated", {
            token,
            appId,
            channelName,
            uid
        })
    );
});
