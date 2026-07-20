import { Router } from "express";
import rateLimit from "express-rate-limit";
import { login, refresh, logout } from "../controllers/auth";

const router = Router();

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

router.post("/login", loginLimiter, login);
router.post("/refresh", refresh);
router.post("/logout", logout);

export default router;
