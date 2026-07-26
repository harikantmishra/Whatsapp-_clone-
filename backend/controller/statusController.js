const { uploadFileToCloudinary } = require("../config/cloudinary");
const Status = require("../models/Status");
const User = require("../models/User");
const response = require("../utils/responseHandler");

exports.createStatus = async (req, res) => {
  try {
    const { content, contentType } = req.body;
    const userId = req.user.userId;
    const file = req.file;

    let mediaUrl = null;
    let finalContentType = contentType || "text";

    if (file) {
      const uploadedFile = await uploadFileToCloudinary(file);

      if (!uploadedFile?.secure_url) {
        return response(res, 400, "Failed to upload media");
      }

      mediaUrl = uploadedFile.secure_url;

      if (file.mimetype.startsWith("image")) {
        finalContentType = "image";
      } else if (file.mimetype.startsWith("video")) {
        finalContentType = "video";
      } else {
        return response(res, 400, "Unsupported file type");
      }
    } else if (content) {
      finalContentType = "text";
    } else {
      return response(res, 400, "Status content is required");
    }

    const expiresAt = new Date();
    expiresAt.setHours(expiresAt.getHours() + 24);

    const status = await Status.create({
      user: userId,
      content: mediaUrl || content,
      contentType: finalContentType,
      expiresAt,
    });

    const populatedStatus = await Status.findById(status._id).populate(
      "user",
      "username profilePicture",
    );

    if (req.io && req.socketUserMap) {
      for (const [connectedUserId, socketId] of req.socketUserMap.entries()) {
        if (connectedUserId !== userId) {
          req.io.to(socketId).emit("new_status", populatedStatus);
        }
      }
    }

    return response(res, 201, "Status created successfully", populatedStatus);
  } catch (error) {
    console.error(error);
    return response(res, 500, error.message);
  }
};

exports.getStatus = async (req, res) => {
  try {
    const statuses = await Status.find({
      expiresAt: { $gt: new Date() },
    })
      .populate("user", "username profilePicture")
      .populate("viewers", "username profilePicture")
      .sort({ createdAt: -1 });

    return response(res, 200, "Statuses fetched successfully", statuses);
  } catch (error) {
    console.error(error);
    return response(res, 500, error.message);
  }
};

exports.viewStatus = async (req, res) => {
  try {
    const { statusId } = req.params;
    const userId = req.user.userId;

    const status = await Status.findById(statusId);

    if (!status) {
      return response(res, 404, "Status not found");
    }

    const alreadyViewed = status.viewers.some(
      (viewerId) => viewerId.toString() === userId,
    );

    let updatedStatus = await Status.findById(statusId)
      .populate("user", "username profilePicture")
      .populate("viewers", "username profilePicture");

    if (!alreadyViewed) {
      status.viewers.push(userId);
      await status.save();

      updatedStatus = await Status.findById(statusId)
        .populate("user", "username profilePicture")
        .populate("viewers", "username profilePicture");

      if (req.io && req.socketUserMap) {
        const statusOwnerSocketId = req.socketUserMap.get(status.user.toString());

        if (statusOwnerSocketId) {
          req.io.to(statusOwnerSocketId).emit("status_viewed", {
            statusId,
            viewerId: userId,
            totalViewers: updatedStatus.viewers.length,
            viewers: updatedStatus.viewers,
          });
        }
      }
    }

    return response(res, 200, "Status viewed successfully", updatedStatus);
  } catch (error) {
    console.error(error);
    return response(res, 500, error.message);
  }
};

exports.getStatusViewers = async (req, res) => {
  try {
    const { statusId } = req.params;
    const userId = req.user.userId;

    const status = await Status.findById(statusId)
      .populate("user", "username profilePicture")
      .populate("viewers", "username profilePicture");

    if (!status) {
      return response(res, 404, "Status not found");
    }

    const statusOwnerId =
      status.user && typeof status.user === "object" && status.user._id
        ? status.user._id.toString()
        : status.user.toString();

    if (statusOwnerId !== userId) {
      return response(res, 403, "You are not authorized to view these viewers");
    }

    const owner =
      status.user && typeof status.user === "object" && status.user._id
        ? status.user
        : await User.findById(status.user).select("username profilePicture");

    const otherViewers = status.viewers.filter(
      (viewer) => viewer?._id?.toString() !== owner?._id?.toString(),
    );

    return response(res, 200, "Status viewers fetched successfully", [
      owner,
      ...otherViewers,
    ]);
  } catch (error) {
    console.error(error);
    return response(res, 500, error.message);
  }
};

exports.deleteStatus = async (req, res) => {
  try {
    const { statusId } = req.params;
    const userId = req.user.userId;

    const status = await Status.findById(statusId);

    if (!status) {
      return response(res, 404, "Status not found");
    }

    if (status.user.toString() !== userId) {
      return response(res, 403, "You are not authorized to delete this status");
    }

    await Status.findByIdAndDelete(statusId);

    if (req.io && req.socketUserMap) {
      for (const [connectedUserId, socketId] of req.socketUserMap.entries()) {
        if (connectedUserId !== userId) {
          req.io.to(socketId).emit("status_deleted", { statusId });
        }
      }
    }

    return response(res, 200, "Status deleted successfully");
  } catch (error) {
    console.error(error);
    return response(res, 500, error.message);
  }
};
