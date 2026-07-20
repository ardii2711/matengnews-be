import { Router } from "express";
import { getPublicVideos, getDashboardVideos, createVideo, updateVideo, changeVideoStatus, deleteVideo } from "../controllers/video";
import { protect, restrictTo } from "../middlewares/auth";

const router = Router();

// Rute Publik (Tanpa Login)
router.get("/public", getPublicVideos);

// Rute Dashboard (Wajib Login)
router.get("/dashboard", protect, getDashboardVideos);
router.post("/dashboard", protect, createVideo);
router.put("/dashboard/:id", protect, updateVideo);
router.patch("/dashboard/:id/status", protect, restrictTo("ADMIN"), changeVideoStatus);
router.delete("/dashboard/:id", protect, deleteVideo);

export default router;
