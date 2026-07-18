import { Request, Response, NextFunction } from "express";
import prisma from "../config/db";
import { hashPassword } from "../utils/auth";

// 1. Ambil Semua Pengguna
export const getUsers = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const users = await prisma.user.findMany({
      select: { id: true, name: true, email: true, role: true, createdAt: true },
      orderBy: { createdAt: "desc" },
    });
    res.status(200).json({ success: true, data: users });
  } catch (error) {
    next(error);
  }
};

// 2. Buat Akun Baru (Editor/Admin)
export const createUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const { name, email, password, role } = req.body;

    if (!name || !email || !password) {
      res.status(400).json({ success: false, message: "Nama, email, dan password wajib diisi." });
      return;
    }

    const existingUser = await prisma.user.findUnique({ where: { email } });
    if (existingUser) {
      res.status(400).json({ success: false, message: "Email sudah terdaftar." });
      return;
    }

    const hashedPassword = await hashPassword(password);

    const newUser = await prisma.user.create({
      data: { name, email, password: hashedPassword, role: role || "EDITOR" },
      select: { id: true, name: true, email: true, role: true }, // Jangan kembalikan password
    });

    res.status(201).json({ success: true, message: "Akun berhasil dibuat.", data: newUser });
  } catch (error) {
    next(error);
  }
};

// 3. Hapus Pengguna
export const deleteUser = async (req: Request, res: Response, next: NextFunction): Promise<void> => {
  try {
    const id = req.params.id as string;

    // Cegah Admin menghapus dirinya sendiri secara tidak sengaja
    if (id === req.user?.id) {
      res.status(400).json({ success: false, message: "Anda tidak dapat menghapus akun Anda sendiri." });
      return;
    }

    await prisma.user.delete({ where: { id } });
    res.status(200).json({ success: true, message: "Akun berhasil dihapus." });
  } catch (error) {
    next(error);
  }
};
