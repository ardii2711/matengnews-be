import express, { Application, Request, Response } from "express";
import cors from "cors";
import helmet from "helmet";
import dotenv from "dotenv";
import cookieParser from "cookie-parser";
import { errorHandler } from "./middlewares/error";
import prisma from "./config/db";

import authRoutes from "./routes/auth";
import categoryRoutes from "./routes/category";
import postRoutes from "./routes/post";
import videoRoutes from "./routes/video";
import userRoutes from "./routes/user";
import statsRoutes from "./routes/stats";

// Memuat environment variables dari file .env
dotenv.config();

const app: Application = express();
const PORT = process.env.PORT || 5000;

// --- SECURITY MIDDLEWARES ---
app.set("trust proxy", 1);

// 1. Helmet untuk mengamankan HTTP Header
app.use(helmet());

// 2. CORS (Cross-Origin Resource Sharing) — allow all origins
app.use(
  cors({
    origin: true,
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

// --- BODY PARSERS ---
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(cookieParser());

// --- REGISTRASI ROUTING API ---
app.use("/api/auth", authRoutes);
app.use("/api/categories", categoryRoutes);
app.use("/api/posts", postRoutes);
app.use("/api/videos", videoRoutes);
app.use("/api/users", userRoutes);
app.use("/api/stats", statsRoutes);

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

  // 2. Self-ping ke Render (jika dikonfigurasi)
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

  // 3. Supabase Keep-Alive (Mencegah Database di-pause otomatis)
  const databasePingInterval = 12 * 60 * 60 * 1000; // Setiap 12 jam sekali
  console.log("Mengaktifkan Supabase keep-alive setiap 12 jam.");

  setInterval(async () => {
    try {
      await prisma.$executeRaw`SELECT 1;`;
      console.log(`[${new Date().toLocaleTimeString("id-ID")}] Supabase keep-alive berhasil dibunyikan.`);
    } catch (error) {
      console.error(`[${new Date().toLocaleTimeString("id-ID")}] Gagal menjaga Supabase tetap aktif:`, error);
    }
  }, databasePingInterval);
});
