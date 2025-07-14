import express from "express";
import {
  sendNewMessage,
  getMessageById,
  getUnreadMessageCount,
  getUsersList,
  markMessagesAsRead,
} from "../controllers/message.controller.js";
import { protectRoute } from "../middleware/auth.middleware.js";

const router = express.Router();

// Get messages between two users
router.get("/", protectRoute, getUsersList);
router.get("/:id", protectRoute, getMessageById);
router.post("/send/:id", protectRoute, sendNewMessage);
router.get("/unread/:id", protectRoute, getUnreadMessageCount);
router.patch("/read/:id", protectRoute, markMessagesAsRead);

export default router;
