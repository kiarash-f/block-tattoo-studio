import { v2 as cloudinary } from 'cloudinary';
export declare const CLOUDINARY: unique symbol;
export declare function createCloudinaryClient(): typeof cloudinary;
