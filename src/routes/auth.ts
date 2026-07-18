import { Router } from "express";
import { login } from "../controllers/auth";

const router = Router();

// Jalur akses POST /api/auth/login
router.post("/login", login);

export default router;
