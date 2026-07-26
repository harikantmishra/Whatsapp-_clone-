const multer = require("multer");
const cloudinary = require("cloudinary").v2;
require("dotenv").config();
const fs = require("fs");
const path = require("path");
const os = require("os");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_NAME,
  api_key: process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

const tempUploadDir = process.env.UPLOAD_TMP_DIR
  ? path.resolve(process.env.UPLOAD_TMP_DIR)
  : path.join(os.tmpdir(), "whatsapp-clone-uploads");

fs.mkdirSync(tempUploadDir, { recursive: true });

const uploadFileToCloudinary = (file) => {
  const options = {
    resource_type: file.mimetype.startsWith("video")
      ? "video"
      : file.mimetype.startsWith("image")
        ? "image"
        : "raw",
  };

  return new Promise((resolve, reject) => {
    const uploader = file.mimetype.startsWith("video")
      ? cloudinary.uploader.upload_large
      : cloudinary.uploader.upload;

    uploader(file.path, options, (error, result) => {
      fs.unlink(file.path, () => {});

      if (error) {
        return reject(error);
      }

      resolve(result);
    });
  });
};

const multerMiddleware = multer({
  dest: tempUploadDir,
}).single("media");

const profileUploadMiddleware = multer({
  dest: tempUploadDir,
}).single("profilePicture");

module.exports = {
  uploadFileToCloudinary,
  multerMiddleware,
  profileUploadMiddleware,
  tempUploadDir,
};
