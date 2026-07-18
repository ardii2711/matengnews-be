import { Request, Response, NextFunction } from "express";
import prisma from "../config/db";
import { comparePassword, generateToken } from "../utils/auth";

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    // 1. Validasi input kosong
    if (!email || !password) {
      res.status(400).json({ success: false, message: "Email dan password wajib diisi." });
      return;
    }

    // 2. Cari user di database berdasarkan email
    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ success: false, message: "Email atau password salah." });
      return;
    }

    // 3. Bandingkan password input dengan password terenkripsi di DB
    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ success: false, message: "Email atau password salah." });
      return;
    }

    // 4. Generate Token JWT jika kredensial cocok
    const token = generateToken({ id: user.id, role: user.role });

    // 5. Kirim respons sukses (Kecualikan data password demi keamanan)
    res.status(200).json({
      success: true,
      message: "Login berhasil, selamat datang kembali!",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        role: user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};
