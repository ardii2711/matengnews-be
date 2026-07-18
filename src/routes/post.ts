import { Router } from "express";
import { getPublicPosts, getPostBySlug, getDashboardPosts, createPost, changePostStatus } from "../controllers/post";
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

// Lihat daftar berita di dashboard
router.get("/dashboard", protect, getDashboardPosts);

// Buat berita baru (Upload gambar tunggal dengan field name 'thumbnail')
router.post("/dashboard", protect, uploadImage.single("thumbnail"), createPost);

// Ubah status publikasi (Hanya Admin)
router.patch("/dashboard/:id/status", protect, restrictTo("ADMIN"), changePostStatus);

export default router;
