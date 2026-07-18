import express, { Application, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import rateLimit from "express-rate-limit";
import dotenv from "dotenv";
import { errorHandler } from "./middlewares/error";

import authRoutes from "./routes/auth";
import categoryRoutes from "./routes/category";
import postRoutes from "./routes/post";
import videoRoutes from "./routes/video";
import userRoutes from "./routes/user";

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

// --- REGISTRASI ROUTING API ---
app.use("/api/auth", authRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/videos", videoRoutes);
app.use("/api/users", userRoutes);

// 1. Tambahkan Health Check Endpoint (Untuk sasaran tembak self-ping Render)
app.get("/", (req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    message: "Backend Matengnews.id aktif dan berjalan lancar!",
  });
});

// Middleware Error Handling (Harus berada di bawah semua route)
app.use(errorHandler);

// Cukup SATU app.listen di bagian paling bawah
app.listen(PORT, () => {
  console.log(`[server]: Server berjalan aman di port ${PORT} dalam mode ${process.env.NODE_ENV || "development"}`);

  // 2. Tempelkan kode Self-Ping kamu di sini (berjalan setelah server nyala)
  if (process.env.RENDER_EXTERNAL_HOSTNAME) {
    const selfPingUrl = `https://${process.env.RENDER_EXTERNAL_HOSTNAME}`;
    const pingInterval = 7 * 60 * 1000; // 7 menit

    console.log(`Mengaktifkan self-ping ke: ${selfPingUrl} setiap 7 menit`);

    setInterval(async () => {
      try {
        const response = await fetch(selfPingUrl);
        if (response.ok) {
          console.log(`[${new Date().toLocaleTimeString("id-ID")}] Self-ping sukses ke ${selfPingUrl}`);
        } else {
          console.warn(`[${new Date().toLocaleTimeString("id-ID")}] Self-ping gagal (Status: ${response.status})`);
        }
      } catch (error) {
        console.error(`[${new Date().toLocaleTimeString("id-ID")}] Error saat self-ping:`, error instanceof Error ? error.message : "Unknown error");
      }
    }, pingInterval);
  }
});
