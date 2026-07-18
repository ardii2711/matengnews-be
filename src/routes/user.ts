import { Router } from "express";
import { getUsers, createUser, deleteUser } from "../controllers/user";
import { protect, restrictTo } from "../middlewares/auth";

const router = Router();

// Semua rute user wajib login dan harus ADMIN
router.use(protect, restrictTo("ADMIN"));

router.get("/", getUsers);
router.post("/", createUser);
router.delete("/:id", deleteUser);

export default router;
