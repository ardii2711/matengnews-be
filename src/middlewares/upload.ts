import multer from "multer";
import { Request } from "express";

// 1. Konfigurasi penyimpanan sementara di RAM
const storage = multer.memoryStorage();

// 2. Filter ekstensi file (Hanya menerima format gambar utama)
const fileFilter = (req: Request, file: Express.Multer.File, cb: multer.FileFilterCallback) => {
  const allowedTypes = ["image/jpeg", "image/png", "image/webp", "image/jpg"];

  if (allowedTypes.includes(file.mimetype)) {
    cb(null, true);
  } else {
    cb(new Error("Format file tidak didukung! Hanya diperbolehkan mengunggah file gambar (JPEG, JPG, PNG, WEBP)."));
  }
};

// 3. Batasi ukuran maksimal gambar (Misal: Maksimal 2 MB demi efisiensi)
export const uploadImage = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: {
    fileSize: 2 * 1024 * 1024, // 2 MegaBytes
  },
});
