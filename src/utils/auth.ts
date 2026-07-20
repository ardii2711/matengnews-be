import bcrypt from "bcryptjs";
import jwt from "jsonwebtoken";
import crypto from "crypto";

if (!process.env.JWT_SECRET) {
  throw new Error("JWT_SECRET tidak ditemukan di environment variables. Harap set di file .env");
}

const JWT_SECRET = process.env.JWT_SECRET;
const ACCESS_TOKEN_EXPIRES = "15m";
export const REFRESH_TOKEN_DAYS = 7;

export const hashPassword = async (password: string): Promise<string> => {
  const salt = await bcrypt.genSalt(10);
  return bcrypt.hash(password, salt);
};

export const comparePassword = async (password: string, hash: string): Promise<boolean> => {
  return bcrypt.compare(password, hash);
};

export interface TokenPayload {
  id: string;
  role: "ADMIN" | "EDITOR";
}

export const generateAccessToken = (payload: TokenPayload): string => {
  return jwt.sign(payload, JWT_SECRET, {
    expiresIn: ACCESS_TOKEN_EXPIRES,
  });
};

export const verifyAccessToken = (token: string): TokenPayload => {
  return jwt.verify(token, JWT_SECRET) as TokenPayload;
};

export const generateRefreshTokenValue = (): string => {
  return crypto.randomBytes(40).toString("hex");
};

export const calculateRefreshExpiry = (): Date => {
  const expiry = new Date();
  expiry.setDate(expiry.getDate() + REFRESH_TOKEN_DAYS);
  return expiry;
};
