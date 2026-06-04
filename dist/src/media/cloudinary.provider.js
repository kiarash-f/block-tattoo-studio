"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.CLOUDINARY = void 0;
exports.createCloudinaryClient = createCloudinaryClient;
const cloudinary_1 = require("cloudinary");
exports.CLOUDINARY = Symbol('CLOUDINARY');
function createCloudinaryClient() {
    const cloudName = process.env.CLOUDINARY_CLOUD_NAME;
    const apiKey = process.env.CLOUDINARY_API_KEY;
    const apiSecret = process.env.CLOUDINARY_API_SECRET;
    if (!cloudName || !apiKey || !apiSecret) {
        throw new Error('Missing Cloudinary env vars: CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET');
    }
    cloudinary_1.v2.config({
        cloud_name: cloudName,
        api_key: apiKey,
        api_secret: apiSecret,
        secure: true,
    });
    return cloudinary_1.v2;
}
//# sourceMappingURL=cloudinary.provider.js.map