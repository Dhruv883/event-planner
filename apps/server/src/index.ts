import "dotenv/config";
import cors from "cors";
import express from "express";
import { auth } from "./lib/auth";
import { fromNodeHeaders, toNodeHandler } from "better-auth/node";
import eventsRouter from "./routers/events";

const app = express();

app.use(
  cors({
    origin: process.env.CORS_ORIGIN || "",
    methods: ["GET", "POST", "DELETE", "PUT", "PATCH"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);

app.all("/api/auth{/*path}", toNodeHandler(auth));

app.use(express.json());

app.use("/api/events", eventsRouter);

const port = process.env.PORT || 3000;
app.listen(port, () => {
  console.log(`Server is running on port ${port}`);
});
