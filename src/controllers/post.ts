import { Request, Response, NextFunction } from "express";
import prisma from "../config/db";
import { uploadToR2, deleteFromR2 } from "../utils/storage";

// ==========================================
// A. ENDPOINT UNTUK PUBLIK (Tanpa Login)
// ==========================================

// 1. Ambil Semua Berita (Hanya yang PUBLISHED)
export const getPublicPosts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const posts = await prisma.post.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { createdAt: "desc" },
      include: {
        author: { select: { name: true } },
        category: { select: { name: true, slug: true } },
      },
    });
    res.status(200).json({ success: true, data: posts });
  } catch (error) {
    next(error);
  }
};

// 2. Baca Detail Berita & Otomatis Tambah Views
export const getPostBySlug = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const slug = req.params.slug as string;

    const post = await prisma.post.findUnique({
      where: { slug },
      include: {
        author: { select: { name: true } },
        category: { select: { name: true, slug: true } },
      },
    });

    if (!post || post.status !== "PUBLISHED") {
      res.status(404).json({ success: false, message: "Berita tidak ditemukan." });
      return;
    }

    // Tambah jumlah views secara background (tidak perlu await agar res cepat)
    prisma.post
      .update({
        where: { id: post.id },
        data: { views: { increment: 1 } },
      })
      .catch((err) => console.error("Gagal update views:", err));

    res.status(200).json({ success: true, data: post });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// B. ENDPOINT UNTUK DASHBOARD (Butuh Login)
// ==========================================

// 3. Ambil Berita untuk Dashboard
export const getDashboardPosts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const userRole = req.user?.role;
    const userId = req.user?.id;

    // Jika Editor, hanya tampilkan berita miliknya. Jika Admin, tampilkan semua.
    const queryFilter = userRole === "EDITOR" ? { authorId: userId } : {};

    const posts = await prisma.post.findMany({
      where: queryFilter,
      orderBy: { createdAt: "desc" },
      include: { category: { select: { name: true } }, author: { select: { name: true } } },
    });

    res.status(200).json({ success: true, data: posts });
  } catch (error) {
    next(error);
  }
};

// 4. Buat Berita Baru (Dengan Upload Gambar R2)
export const createPost = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { title, slug, content, categoryId } = req.body;
    const userId = req.user?.id as string;
    const userRole = req.user?.role;

    if (!title || !slug || !content || !categoryId) {
      res.status(400).json({ success: false, message: "Data berita tidak lengkap." });
      return;
    }

    // Pastikan ada file yang diunggah
    if (!req.file) {
      res.status(400).json({ success: false, message: "Gambar thumbnail wajib diunggah." });
      return;
    }

    // Proses upload ke R2
    const thumbnailUrl = await uploadToR2(req.file, "thumbnails");

    // Tentukan status publikasi
    // Admin bisa langsung publish (jika dikirim dari frontend), Editor paksa masuk DRAFT
    const status = userRole === "ADMIN" ? req.body.status || "DRAFT" : "DRAFT";

    const newPost = await prisma.post.create({
      data: {
        title,
        slug: slug.toLowerCase().replace(/ /g, "-"),
        content,
        categoryId,
        authorId: userId,
        thumbnailUrl,
        status,
      },
    });

    res.status(201).json({ success: true, message: "Berita berhasil dibuat.", data: newPost });
  } catch (error) {
    next(error);
  }
};

// 5. Ubah Status Publikasi (Khusus Admin)
export const changePostStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    // Penegasan tipe agar TypeScript tahu ini pasti string tunggal
    const id = req.params.id as string;
    const { status } = req.body;

    if (status !== "PUBLISHED" && status !== "DRAFT") {
      res.status(400).json({ success: false, message: "Status tidak valid." });
      return;
    }

    const updatedPost = await prisma.post.update({
      where: { id },
      data: { status },
    });

    res.status(200).json({ success: true, message: `Status berita berhasil diubah menjadi ${status}.`, data: updatedPost });
  } catch (error) {
    next(error);
  }
};
