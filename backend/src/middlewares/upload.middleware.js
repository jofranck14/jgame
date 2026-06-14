const multer = require("multer");
const { v2: cloudinary } = require("cloudinary");
const { CloudinaryStorage } = require("multer-storage-cloudinary");

cloudinary.config({
  cloud_name: process.env.CLOUDINARY_CLOUD_NAME,
  api_key:    process.env.CLOUDINARY_API_KEY,
  api_secret: process.env.CLOUDINARY_API_SECRET,
});

// Stockage pour les preuves de paiement
const paymentStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:          "jgame/payments",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation:  [{ width: 1200, quality: "auto" }],
  },
});

// Stockage pour les avatars
const avatarStorage = new CloudinaryStorage({
  cloudinary,
  params: {
    folder:          "jgame/avatars",
    allowed_formats: ["jpg", "jpeg", "png", "webp"],
    transformation:  [{ width: 400, height: 400, crop: "fill", quality: "auto" }],
  },
});

const fileFilter = (req, file, cb) => {
  const allowed = ["image/jpeg", "image/png", "image/jpg", "image/webp"];
  allowed.includes(file.mimetype)
    ? cb(null, true)
    : cb(new Error("Format non supporté. Utilise JPG, PNG ou WEBP"), false);
};

const uploadPayment = multer({ storage: paymentStorage, fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });
const uploadAvatar  = multer({ storage: avatarStorage,  fileFilter, limits: { fileSize: 5 * 1024 * 1024 } });

// Export rétrocompatible : `upload` = payment (comme avant)
module.exports = { upload: uploadPayment, uploadAvatar, cloudinary };