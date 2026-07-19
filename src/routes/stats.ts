import { Router } from "express";
import { getStats } from "../controllers/stats";
import { protect } from "../middlewares/auth";

const router = Router();

router.get("/", protect, getStats);

export default router;
