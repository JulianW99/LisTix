import app from "./app.js";
import { bootstrapDatabase } from "./db/bootstrap.js";

await bootstrapDatabase();

export default app;
