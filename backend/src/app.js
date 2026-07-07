import cookieParser from "cookie-parser";
import cors from "cors";
import express from "express";
import { errorHandler } from "./middleware/errorHandler.js";
import routes from "./routes/index.js";

const app = express();

const isAllowedDevelopmentOrigin = (origin) => {
  if (!origin) {
    return true;
  }

  try {
    const { hostname } = new URL(origin);

    return (
      hostname === "localhost" ||
      hostname === "127.0.0.1" ||
      hostname === "::1" ||
      /^10(?:\.\d{1,3}){3}$/.test(hostname) ||
      /^192\.168(?:\.\d{1,3}){2}$/.test(hostname) ||
      /^172\.(1[6-9]|2\d|3[0-1])(?:\.\d{1,3}){2}$/.test(hostname)
    );
  } catch {
    return false;
  }
};

app.use(
  cors({
    origin: (origin, callback) => {
      // Allow requests with no origin (like curl) and local development origins,
      // including loopback and private LAN addresses used by Vite.
      if (isAllowedDevelopmentOrigin(origin)) {
        return callback(null, true);
      }
      return callback(new Error("Not allowed by CORS"));
    },
    credentials: true,
  }),
);
app.use(express.json());
app.use(cookieParser());

app.use("/api", routes);
app.use(errorHandler);

export default app;
