import { Router } from "express";
import rateLimit from "express-rate-limit";
import { login } from "../controllers/auth";

const router = Router();

// Rate limiter khusus login — skip successful requests
const loginLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 10,
  message: {
    success: false,
    message: "Terlalu banyak percobaan login gagal. Silakan coba lagi setelah 15 menit.",
  },
  standardHeaders: true,
  legacyHeaders: false,
  skipSuccessfulRequests: true,
});

// Jalur akses POST /api/auth/login
router.post("/login", loginLimiter, login);

export default router;
