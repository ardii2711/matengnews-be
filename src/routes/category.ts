import { Router } from "express";
import { getAllCategories, createCategory, updateCategory, deleteCategory } from "../controllers/category";
import { protect, restrictTo } from "../middlewares/auth";

const router = Router();

// Rute Terbuka (Public)
router.get("/", getAllCategories);

// Rute Terproteksi (Hanya Admin yang bisa menambah & menghapus)
router.post("/", protect, restrictTo("ADMIN"), createCategory);

router.delete("/:id", protect, restrictTo("ADMIN"), deleteCategory);

router.put("/:id", protect, restrictTo("ADMIN"), updateCategory);

export default router;
