import dotenv from "dotenv";
import { fileURLToPath } from "node:url";

// The .env file lives at the repo root, one level above server/
dotenv.config({ path: fileURLToPath(new URL("../../.env", import.meta.url)) });
