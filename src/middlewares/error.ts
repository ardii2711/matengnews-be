import { Request, Response, NextFunction } from "express";
import { MulterError } from "multer";

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction): void => {
  console.error("[Error]:", err.message || err);

  // Tangani error Multer secara spesifik
  if (err instanceof MulterError) {
    if (err.code === "LIMIT_FILE_SIZE") {
      res.status(400).json({
        success: false,
        message: "Ukuran file terlalu besar. Maksimal ukuran gambar adalah 2 MB.",
      });
      return;
    }
    res.status(400).json({
      success: false,
      message: `Kesalahan saat mengunggah file: ${err.message}`,
    });
    return;
  }

  // Tangani error dari filter file (format tidak didukung)
  if (err.message && err.message.includes("Format file tidak didukung")) {
    res.status(400).json({
      success: false,
      message: err.message,
    });
    return;
  }

  const statusCode = err.statusCode ? err.statusCode : 500;

  res.status(statusCode).json({
    success: false,
    message: err.message || "Terjadi kesalahan internal pada server.",
    // Hanya tampilkan stack trace jika sedang di tahap development lokal
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
};
