import { Request, Response, NextFunction } from "express";
import { verifyAccessToken } from "../utils/auth";

// 1. Middleware untuk memeriksa apakah user sudah login (Mempunyai token JWT yang valid)
export const protect = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    let token: string | undefined;

    // Periksa apakah token dikirimkan di header Authorization dengan format 'Bearer <token>'
    if (req.headers.authorization && req.headers.authorization.startsWith("Bearer")) {
      token = req.headers.authorization.split(" ")[1];
    }

    if (!token) {
      res.status(401).json({
        success: false,
        message: "Akses ditolak. Anda belum login atau tidak menyertakan token autentikasi.",
      });
      return;
    }

    // Verifikasi validitas token JWT
    const decoded = verifyAccessToken(token);

    // Tempelkan data payload token ke objek request agar bisa diakses di controller berikutnya
    req.user = decoded;

    next();
  } catch (error) {
    res.status(401).json({
      success: false,
      message: "Token autentikasi tidak valid atau telah kedaluwarsa. Silakan login kembali.",
    });
  }
};

// 2. Middleware Otorisasi Peran (Role Guard)
// Mengunci rute tertentu berdasarkan peran ('ADMIN' atau 'EDITOR')
export const restrictTo = (...allowedRoles: ("ADMIN" | "EDITOR")[]) => {
  return (req: Request, res: Response, next: NextFunction): void => {
    // Pastikan user sudah melewati middleware 'protect' terlebih dahulu
    if (!req.user) {
      res.status(500).json({
        success: false,
        message: "Terjadi kesalahan sistem pada middleware otorisasi.",
      });
      return;
    }

    // Periksa apakah peran user ada di dalam daftar peran yang diizinkan
    if (!allowedRoles.includes(req.user.role)) {
      res.status(403).json({
        success: false,
        message: "Akses ditolak. Anda tidak memiliki izin untuk mengakses modul ini.",
      });
      return;
    }

    next();
  };
};
