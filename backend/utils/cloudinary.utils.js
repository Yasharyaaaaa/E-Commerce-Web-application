import cloudinary from "../config/cloudinary.config.js";
import fs from "fs";

/**
 * Uploads a local file to Cloudinary and removes the local file afterwards.
 * @param {string} localFilePath - Path to the local file.
 * @returns {Promise<object|null>} - Cloudinary upload response or null.
 */
export const uploadOnCloudinary = async (localFilePath) => {
  try {
    if (!localFilePath) return null;

    // Upload the file to Cloudinary
    const response = await cloudinary.uploader.upload(localFilePath, {
      resource_type: "auto",
    });

    // Only remove the file if it exists locally (not a URL)
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    return response;
  } catch (error) {
    // Remove the local file even if upload fails
    if (fs.existsSync(localFilePath)) {
      fs.unlinkSync(localFilePath);
    }
    console.error("Cloudinary upload error:", error);
    return null;
  }
};

/**
 * Deletes a file from Cloudinary.
 * @param {string} publicId - Cloudinary public ID of the resource.
 */
export const deleteFromCloudinary = async (publicId) => {
  try {
    if (!publicId) return null;
    const response = await cloudinary.uploader.destroy(publicId);
    return response;
  } catch (error) {
    console.error("Cloudinary deletion error:", error);
    return null;
  }
};