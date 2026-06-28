import cors from "cors";
import express from "express";
import { authRoutes } from "./routes/auth.routes";

export const app = express();

app.use(
  cors({
    origin: ["http://localhost:1420", "http://localhost:5173"],
    credentials: true,
  })
);

app.use(express.json());

app.get("/health", (_request, response) => {
  response.json({
    status: "ok",
    service: "naniwa-auth",
  });
});

app.use("/auth", authRoutes);