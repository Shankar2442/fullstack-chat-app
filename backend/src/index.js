import express from "express";
import dotenv from "dotenv";
import { connectDB } from "./lib/db.js";
import cookieParser from "cookie-parser";
import messageRoutes from "./routes/message.routes.js";
import authRoutes from "./routes/auth.route.js";
import cors from "cors";
import { app, server } from "./lib/socket.js";
import path from "path";

dotenv.config();

const PORT = process.env.PORT;
const __dirname = path.resolve();

// Middleware to parse JSON bodies with increased limit for image uploads
app.use(express.json({ limit: '10mb' }));
app.use(express.urlencoded({ limit: '10mb', extended: true }));

// Middleware to parse cookies
app.use(cookieParser());

// Middleware to enable CORS
app.use(
  cors({
    origin: "http://localhost:5173",
    credentials: true,
  })
);

// Routes
try {
  app.use("/api/auth", authRoutes);
  console.log("Loaded authRoutes ✅");
} catch (err) {
  console.error("❌ Error loading authRoutes:", err);
}

try {
  app.use("/api/message", messageRoutes);
  console.log("Loaded messageRoutes ✅");
} catch (err) {
  console.error("❌ Error loading messageRoutes:", err);
}

// Serve static files in production
if (process.env.NODE_ENV === "production") {
  app.use(express.static(path.join(__dirname, "../frontend/dist")));

  // Catch-all non-API route for SPA fallback
  app.get(/^\/(?!api).*/, (req, res) => {
    res.sendFile(path.resolve(__dirname, "../frontend/dist/index.html"));
  });
}

// Connect to database first
await connectDB();

// Start the server
server.listen(PORT, () => {
  console.log("Server started on port", PORT);
});
