import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET tidak ditemukan di environment variables. Harap set di file .env");
}

const JWT_SECRET = process.env.JWT_SECRET;
const JWT_EXPIRES_IN = (process.env.JWT_EXPIRES_IN || "1d") as jwt.SignOptions["expiresIn"];

// 1. Enkripsi password mentah menjadi hash sebelum disimpan ke database
export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

// 2. Bandingkan password inputan user dengan password hash yang ada di DB
export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

// Interface payload untuk data di dalam JWT token
export interface TokenPayload {
  id: string;
  role: "ADMIN" | "EDITOR";
}

// 3. Generate Token JWT saat login berhasil
export const generateToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: JWT_EXPIRES_IN, // Sekarang TypeScript sudah sepakat tipe datanya cocok
  });
};

// 4. Verifikasi Token JWT yang dikirimkan client
export const verifyToken = (token: string): TokenPayload => {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
};
