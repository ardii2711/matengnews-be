import { Router } from "express";
import {
  getPublicPosts,
  getPostBySlug,
  getDashboardPosts,
  createPost,
  changePostStatus,
  getPublicPostsByCategory,
  updatePost,
  deletePost, // <-- Impor fungsi baru
} from "../controllers/post";
import { protect, restrictTo } from "../middlewares/auth";
import { uploadImage } from "../middlewares/upload";

const router = Router();

// ==============================
// RUTE PUBLIK (Akses Bebas)
// ==============================
// Prefix: /api/posts/public
router.get("/public", getPublicPosts);
router.get("/public/:slug", getPostBySlug);

// ==============================
// RUTE DASHBOARD (Terproteksi)
// ==============================
// Prefix: /api/posts/dashboard

// RUTE PUBLIK
router.get("/public", getPublicPosts);
router.get("/public/category/:slug", getPublicPostsByCategory); // <-- Rute filter kategori
router.get("/public/:slug", getPostBySlug);

// RUTE DASHBOARD
router.get("/dashboard", protect, getDashboardPosts);
router.post("/dashboard", protect, uploadImage.single("thumbnail"), createPost);
router.patch("/dashboard/:id/status", protect, restrictTo("ADMIN"), changePostStatus);

// <-- Rute Update & Hapus Berita
router.put("/dashboard/:id", protect, uploadImage.single("thumbnail"), updatePost);
router.delete("/dashboard/:id", protect, deletePost);

export default router;
