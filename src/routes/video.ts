import { Router } from "express";
import { getPublicVideos, getDashboardVideos, createVideo, deleteVideo } from "../controllers/video";
import { protect } from "../middlewares/auth";

const router = Router();

// Rute Publik (Tanpa Login)
router.get("/public", getPublicVideos);

// Rute Dashboard (Wajib Login, Admin & Editor bisa akses)
router.get("/dashboard", protect, getDashboardVideos);
router.post("/dashboard", protect, createVideo);
router.delete("/dashboard/:id", protect, deleteVideo);

export default router;
