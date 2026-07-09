// Vercel serverless entrypoint: it hands every request to the Express app
// defined in server.js. All routing (static files + /api/*) is handled there.
import app from "../server.js";

export default app;
