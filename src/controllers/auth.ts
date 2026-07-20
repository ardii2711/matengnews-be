import { Request, Response, NextFunction } from "express";
import prisma from "../config/db";
import { comparePassword, generateAccessToken, generateRefreshTokenValue, calculateRefreshExpiry, REFRESH_TOKEN_DAYS } from "../utils/auth";

const REFRESH_COOKIE_NAME = "refreshToken";
const COOKIE_OPTIONS = {
  httpOnly: true,
  secure: process.env.NODE_ENV === "production",
  sameSite: "lax" as const,
  path: "/",
  maxAge: REFRESH_TOKEN_DAYS * 24 * 60 * 60 * 1000,
};

export const login = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { email, password } = req.body;

    if (!email || !password) {
      res.status(400).json({ success: false, message: "Email dan password wajib diisi." });
      return;
    }

    const user = await prisma.user.findUnique({ where: { email } });
    if (!user) {
      res.status(401).json({ success: false, message: "Email atau password salah." });
      return;
    }

    const isPasswordValid = await comparePassword(password, user.password);
    if (!isPasswordValid) {
      res.status(401).json({ success: false, message: "Email atau password salah." });
      return;
    }

    const accessToken = generateAccessToken({ id: user.id, role: user.role });
    const refreshTokenValue = generateRefreshTokenValue();

    // Simpan refresh token ke database
    await prisma.refreshToken.create({
      data: {
        token: refreshTokenValue,
        userId: user.id,
        expiresAt: calculateRefreshExpiry(),
      },
    });

    // Set refresh token sebagai httpOnly cookie
    res.cookie(REFRESH_COOKIE_NAME, refreshTokenValue, COOKIE_OPTIONS);

    res.status(200).json({
      success: true,
      message: "Login berhasil, selamat datang kembali!",
      accessToken,
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

export const refresh = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const refreshTokenValue = req.cookies?.[REFRESH_COOKIE_NAME];

    if (!refreshTokenValue) {
      res.status(401).json({ success: false, message: "Refresh token tidak ditemukan." });
      return;
    }

    // Cari refresh token di database
    const storedToken = await prisma.refreshToken.findUnique({
      where: { token: refreshTokenValue },
      include: { user: true },
    });

    if (!storedToken || storedToken.revoked || storedToken.expiresAt < new Date()) {
      // Hapus cookie jika token tidak valid
      res.clearCookie(REFRESH_COOKIE_NAME, { path: "/" });
      res.status(401).json({ success: false, message: "Refresh token tidak valid atau telah kedaluwarsa." });
      return;
    }

    // Revoke token lama (rotation)
    await prisma.refreshToken.update({
      where: { id: storedToken.id },
      data: { revoked: true },
    });

    // Buat refresh token baru
    const newRefreshTokenValue = generateRefreshTokenValue();
    await prisma.refreshToken.create({
      data: {
        token: newRefreshTokenValue,
        userId: storedToken.userId,
        expiresAt: calculateRefreshExpiry(),
      },
    });

    // Buat access token baru
    const accessToken = generateAccessToken({
      id: storedToken.user.id,
      role: storedToken.user.role,
    });

    // Set cookie baru
    res.cookie(REFRESH_COOKIE_NAME, newRefreshTokenValue, COOKIE_OPTIONS);

    res.status(200).json({
      success: true,
      accessToken,
      user: {
        id: storedToken.user.id,
        name: storedToken.user.name,
        email: storedToken.user.email,
        role: storedToken.user.role,
      },
    });
  } catch (error) {
    next(error);
  }
};

export const logout = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const refreshTokenValue = req.cookies?.[REFRESH_COOKIE_NAME];

    if (refreshTokenValue) {
      // Revoke refresh token di database
      await prisma.refreshToken.updateMany({
        where: { token: refreshTokenValue },
        data: { revoked: true },
      });
    }

    res.clearCookie(REFRESH_COOKIE_NAME, { path: "/" });
    res.status(200).json({ success: true, message: "Logout berhasil." });
  } catch (error) {
    next(error);
  }
};
