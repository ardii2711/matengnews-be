import express, { Application, Request, Response, NextFunction } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";

import authRoutes from "./routes/auth";
import categoryRoutes from "./routes/category";

// Memuat environment variables dari file .env
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5000;

// --- SECURITY MIDDLEWARES ---

// 1. Helmet untuk mengamankan HTTP Header
app.use(helmet());

// 2. CORS (Cross-Origin Resource Sharing)
// Saat development, kita izinkan semua origin. Saat production, kunci ke URL Next.js kamu.
app.use(
  cors({
    origin: process.env.NODE_ENV === "production" ? ["https://matengnews.id", "https://www.matengnews.id"] : "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);

// 3. Rate Limiting untuk mencegah DDoS & Brute Force
const limiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 menit
  max: 100, // Maksimal 100 request per IP dalam 15 menit
  message: {
    success: false,
    message: "Terlalu banyak permintaan dari IP ini, silakan coba lagi nanti setelah 15 menit.",
  },
  standardHeaders: true,
  legacyHeaders: false,
});
app.use("/api/", limiter);

// --- BODY PARSERS ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));

// --- BASE ROUTE CHECK ---
app.get("/api/health", (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "Server Matengnews.id Backend berjalan dengan aman! 🚀",
  });
});

// --- REGISTRASI ROUTING API ---
app.use("/api/auth", authRoutes);
app.use("/api/categories", categoryRoutes);

// --- GLOBAL ERROR HANDLER ---
// Menangkap semua eror tak terduga agar stack trace internal database tidak bocor ke publik
app.use((err: any, req: Request, res: Response, next: NextFunction) => {
  console.error(err.stack);
  res.status(500).json({
    success: false,
    message: "Terjadi kesalahan internal pada server.",
    error: process.env.NODE_ENV === "development" ? err.message : undefined,
  });
});

// Jalankan Server
app.listen(PORT, () => {
  console.log(`[server]: Server berjalan aman di http://localhost:${PORT} dalam mode ${process.env.NODE_ENV}`);
});
