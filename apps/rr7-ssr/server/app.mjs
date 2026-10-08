import path from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";
import { createRequestHandler } from "@react-router/express";
import express from "express";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const rootDir = path.resolve(__dirname, "..");

const app = express();

app.use(express.static(path.join(rootDir, "build/client"), { maxAge: "1h" }));

const buildUrl = pathToFileURL(path.join(rootDir, "build/server/index.js")).href;
const build = await import(buildUrl);

app.all("/{*splat}", createRequestHandler({ build }));

const port = process.env.PORT ?? 3000;

app.listen(port, () => {
  console.log(`React Router SSR app listening on http://localhost:${port}`);
});
