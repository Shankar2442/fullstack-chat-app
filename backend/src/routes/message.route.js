import express from "express";
import { protectRoute } from "../middleware/auth.middleware.js";
import { getUsersList, getMessageById, sendNewMessage } from "../controllers/message.controller.js";

const router = express.Router();

router.get('/users', protectRoute, getUsersList)

router.get('/:id', protectRoute, getMessageById)

router.post('/send/:id', protectRoute, sendNewMessage)

export default router;