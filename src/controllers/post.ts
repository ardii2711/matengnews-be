import { Request, Response, NextFunction } from "express";
import prisma from "../config/db";
import { uploadToR2, deleteFromR2 } from "../utils/storage";
import { parsePagination, parseSort } from "../utils/pagination";

// ==========================================
// A. ENDPOINT UNTUK PUBLIK (Tanpa Login)
// ==========================================

// 1. Ambil Semua Berita (Hanya yang PUBLISHED) — dengan pagination, search, sort
export const getPublicPosts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit, skip } = parsePagination(req);
    const orderBy = parseSort(req);
    const search = (req.query.search as string) || "";

    const where: any = { status: "PUBLISHED" };

    if (search) {
      where.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: {
          author: { select: { name: true } },
          category: { select: { name: true, slug: true } },
        },
      }),
      prisma.post.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      data: posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// 2. Ambil Berita Populer / Featured
export const getFeaturedPosts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const limit = Math.min(20, Math.max(1, parseInt(req.query.limit as string) || 5));

    const posts = await prisma.post.findMany({
      where: { status: "PUBLISHED" },
      orderBy: { views: "desc" },
      take: limit,
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

// 3. Baca Detail Berita & Otomatis Tambah Views
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

// 4. Ambil Berita untuk Dashboard (dengan search & pagination)
export const getDashboardPosts = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { page, limit, skip } = parsePagination(req);
    const userRole = req.user?.role;
    const userId = req.user?.id;
    const search = (req.query.search as string) || "";

    const queryFilter: any = userRole === "EDITOR" ? { authorId: userId } : {};

    if (search) {
      queryFilter.OR = [
        { title: { contains: search, mode: "insensitive" } },
        { description: { contains: search, mode: "insensitive" } },
      ];
    }

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where: queryFilter,
        orderBy: { createdAt: "desc" },
        skip,
        take: limit,
        include: {
          category: { select: { name: true } },
          author: { select: { name: true } },
        },
      }),
      prisma.post.count({ where: queryFilter }),
    ]);

    res.status(200).json({
      success: true,
      data: posts,
      pagination: { page, limit, total, totalPages: Math.ceil(total / limit) },
    });
  } catch (error) {
    next(error);
  }
};

// 5. Buat Berita Baru (Dengan Upload Gambar R2)
export const createPost = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { title, slug, content, categoryId, description, metaTitle, metaDesc } = req.body;
    const userId = req.user?.id as string;
    const userRole = req.user?.role;

    if (!title || !slug || !content || !categoryId) {
      res.status(400).json({ success: false, message: "Data berita tidak lengkap." });
      return;
    }

    // Cek keunikan slug
    const normalizedSlug = slug.toLowerCase().replace(/ /g, "-");
    const existingSlug = await prisma.post.findUnique({ where: { slug: normalizedSlug } });
    if (existingSlug) {
      res.status(400).json({ success: false, message: "Slug berita sudah digunakan, silakan buat slug lain." });
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
    const status = userRole === "ADMIN" ? req.body.status || "DRAFT" : "DRAFT";
    const publishedAt = status === "PUBLISHED" ? new Date() : null;

    const newPost = await prisma.post.create({
      data: {
        title,
        slug: normalizedSlug,
        description: description || null,
        content,
        categoryId,
        authorId: userId,
        thumbnailUrl,
        metaTitle: metaTitle || null,
        metaDesc: metaDesc || null,
        status,
        publishedAt,
      },
    });

    res.status(201).json({ success: true, message: "Berita berhasil dibuat.", data: newPost });
  } catch (error) {
    next(error);
  }
};

// 6. Ubah Status Publikasi (Khusus Admin)
export const changePostStatus = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { status } = req.body;

    if (status !== "PUBLISHED" && status !== "DRAFT") {
      res.status(400).json({ success: false, message: "Status tidak valid." });
      return;
    }

    const updateData: any = { status };

    // Set publishedAt saat pertama kali dipublish
    if (status === "PUBLISHED") {
      const post = await prisma.post.findUnique({ where: { id }, select: { publishedAt: true } });
      if (post && !post.publishedAt) {
        updateData.publishedAt = new Date();
      }
    }

    const updatedPost = await prisma.post.update({
      where: { id },
      data: updateData,
    });

    res.status(200).json({ success: true, message: `Status berita berhasil diubah menjadi ${status}.`, data: updatedPost });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// ENDPOINT PUBLIK TAMBAHAN
// ==========================================

// 7. Ambil Berita Berdasarkan Kategori (dengan pagination)
export const getPublicPostsByCategory = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const slug = req.params.slug as string;
    const { page, limit, skip } = parsePagination(req);
    const orderBy = parseSort(req);

    const where = { status: "PUBLISHED" as const, category: { slug } };

    const [posts, total] = await Promise.all([
      prisma.post.findMany({
        where,
        orderBy,
        skip,
        take: limit,
        include: { category: { select: { name: true, slug: true } }, author: { select: { name: true } } },
      }),
      prisma.post.count({ where }),
    ]);

    res.status(200).json({
      success: true,
      data: posts,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error) {
    next(error);
  }
};

// ==========================================
// ENDPOINT DASHBOARD (EDIT & HAPUS)
// ==========================================

// 8. Ambil Detail Berita untuk Edit / Preview
export const getDashboardPostById = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const userRole = req.user?.role;
    const userId = req.user?.id;

    const post = await prisma.post.findUnique({
      where: { id },
      include: {
        category: { select: { name: true, slug: true } },
        author: { select: { name: true } },
      },
    });

    if (!post) {
      res.status(404).json({ success: false, message: "Berita tidak ditemukan." });
      return;
    }

    if (userRole === "EDITOR" && post.authorId !== userId) {
      res.status(403).json({ success: false, message: "Akses ditolak." });
      return;
    }

    res.status(200).json({ success: true, data: post });
  } catch (error) {
    next(error);
  }
};

// 9. Edit Berita Keseluruhan (Teks & Gambar)
export const updatePost = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const { title, slug, content, categoryId, status, description, metaTitle, metaDesc } = req.body;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    const existingPost = await prisma.post.findUnique({ where: { id } });
    if (!existingPost) {
      res.status(404).json({ success: false, message: "Berita tidak ditemukan." });
      return;
    }

    // Editor hanya boleh edit berita buatannya sendiri
    if (userRole === "EDITOR" && existingPost.authorId !== userId) {
      res.status(403).json({ success: false, message: "Akses ditolak. Anda hanya dapat mengedit berita Anda sendiri." });
      return;
    }

    // Cek keunikan slug jika slug diubah
    if (slug && slug.toLowerCase().replace(/ /g, "-") !== existingPost.slug) {
      const normalizedSlug = slug.toLowerCase().replace(/ /g, "-");
      const slugExists = await prisma.post.findUnique({ where: { slug: normalizedSlug } });
      if (slugExists) {
        res.status(400).json({ success: false, message: "Slug berita sudah digunakan, silakan buat slug lain." });
        return;
      }
    }

    // Tangani Gambar: Jika ada file gambar baru yang diunggah
    let thumbnailUrl = existingPost.thumbnailUrl;
    if (req.file) {
      thumbnailUrl = await uploadToR2(req.file, "thumbnails");
      await deleteFromR2(existingPost.thumbnailUrl);
    }

    const updatedPost = await prisma.post.update({
      where: { id },
      data: {
        title: title || existingPost.title,
        slug: slug ? slug.toLowerCase().replace(/ /g, "-") : existingPost.slug,
        description: description !== undefined ? description : existingPost.description,
        content: content || existingPost.content,
        categoryId: categoryId || existingPost.categoryId,
        metaTitle: metaTitle !== undefined ? metaTitle : existingPost.metaTitle,
        metaDesc: metaDesc !== undefined ? metaDesc : existingPost.metaDesc,
        status: userRole === "ADMIN" && status ? status : existingPost.status,
        thumbnailUrl,
      },
    });

    res.status(200).json({ success: true, message: "Berita berhasil diperbarui.", data: updatedPost });
  } catch (error) {
    next(error);
  }
};

// 9. Hapus Berita (Beserta Gambarnya di R2)
export const deletePost = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;
    const userId = req.user?.id;
    const userRole = req.user?.role;

    const existingPost = await prisma.post.findUnique({ where: { id } });
    if (!existingPost) {
      res.status(404).json({ success: false, message: "Berita tidak ditemukan." });
      return;
    }

    if (userRole === "EDITOR" && existingPost.authorId !== userId) {
      res.status(403).json({ success: false, message: "Akses ditolak. Anda hanya dapat menghapus berita Anda sendiri." });
      return;
    }

    // 1. Hapus gambar fisik di Cloudflare R2 terlebih dahulu
    await deleteFromR2(existingPost.thumbnailUrl);

    // 2. Hapus data di database
    await prisma.post.delete({ where: { id } });

    res.status(200).json({ success: true, message: "Berita dan gambar terkait berhasil dihapus." });
  } catch (error) {
    next(error);
  }
};
