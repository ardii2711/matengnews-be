import { Request, Response, NextFunction } from "express";

export const errorHandler = (err: any, req: Request, res: Response, next: NextFunction): void => {
  console.error("[Error]:", err.message || err);

  const statusCode = err.statusCode ? err.statusCode : 500;

  res.status(statusCode).json({
    success: false,
    message: err.message || "Terjadi kesalahan internal pada server.",
    // Hanya tampilkan stack trace jika sedang di tahap development lokal
    stack: process.env.NODE_ENV === "development" ? err.stack : undefined,
  });
};
