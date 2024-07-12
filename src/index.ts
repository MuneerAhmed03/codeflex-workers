import { Hono } from "hono";
import { drizzle } from "drizzle-orm/d1";
import { eq, and ,desc} from "drizzle-orm";
import users from "./db/schema";
import { UserSchema } from "./types/userSchema";
import { cache } from "hono/cache";
import { cors } from "hono/cors";
export type Env = {
  DB: D1Database;
};

const app = new Hono<{ Bindings: Env }>();

app.use(
  "/*",
  cors({
    origin: "https://codeflex.pages.dev/",
  })
);
app.get("/user", async (c) => {
  const db = drizzle(c.env.DB);
  const query = c.req.query();
  if (query.gh && query.lc) {
    const result = await db
      .select()
      .from(users)
      .where(and(eq(users.github_id, query.gh), eq(users.lc_id, query.lc)));
    if (result.length > 0) {
      c.status(200);
      return c.json(result);

    } else {
      c.status(404);
      return c.json({ message: "User not found" });
    }
  }
  c.status(422);
  return c.json({ message: "Invalid query" });
});

app.post("/post", async (c) => {
  const body: UserSchema = await c.req.json();
  const db = drizzle(c.env.DB);
  const result = await db.insert(users).values(body);
  if (result) {
    return c.json({ message: "User added successfully" });
  } else {
    c.status(500);
    return c.json({ message: "Error adding user" });
  }
});

app.get(
  "/lb",
  cache({
    cacheName: "my-app",
    cacheControl: "max-age=3600",
  }),
  async (c) => {
    const db = drizzle(c.env.DB);
    const grinders = await db
      .select()
      .from(users)
      .orderBy(desc(users.totalSubmissions))
      .where(eq(users.Verified, 1));
    const contributors = await db
      .select()
      .from(users)
      .orderBy(desc(users.totalContributions))
      .where(eq(users.Verified, 1));
    return c.json({ grinders, contributors });
  }
);

export default app;
