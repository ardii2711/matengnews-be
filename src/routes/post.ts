import { Router } from "express";
import {
  getPublicPosts,
  getFeaturedPosts,
  getPostBySlug,
  getDashboardPosts,
  createPost,
  changePostStatus,
  getPublicPostsByCategory,
  updatePost,
  deletePost,
} from "../controllers/post";
import { protect, restrictTo } from "../middlewares/auth";
import { uploadImage } from "../middlewares/upload";

const router = Router();

// ==============================
// RUTE PUBLIK (Akses Bebas)
// ==============================
// Prefix: /api/posts/public
router.get("/public/featured", getFeaturedPosts);
router.get("/public/category/:slug", getPublicPostsByCategory);
router.get("/public", getPublicPosts);
router.get("/public/:slug", getPostBySlug);

// ==============================
// RUTE DASHBOARD (Terproteksi)
// ==============================
// Prefix: /api/posts/dashboard
router.get("/dashboard", protect, getDashboardPosts);
router.post("/dashboard", protect, uploadImage.single("thumbnail"), createPost);
router.patch("/dashboard/:id/status", protect, restrictTo("ADMIN"), changePostStatus);
router.put("/dashboard/:id", protect, uploadImage.single("thumbnail"), updatePost);
router.delete("/dashboard/:id", protect, deletePost);

export default router;
