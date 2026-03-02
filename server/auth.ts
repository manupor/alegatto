import passport from "passport";
import { Strategy as LocalStrategy } from "passport-local";
import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import session from "express-session";
import connectPg from "connect-pg-simple";
import bcrypt from "bcryptjs";
import { db } from "./db";
import { users } from "@shared/schema";
import { eq } from "drizzle-orm";
import type { Express } from "express";
import crypto from "crypto";

declare global {
  namespace Express {
    interface User {
      id: string;
      email: string;
      name: string | null;
      plan: string;
      avatarUrl?: string | null;
    }
  }
}

export async function setupAuth(app: Express) {
  const PgSession = connectPg(session);
  const sessionTtl = 7 * 24 * 60 * 60 * 1000;

  const sessionStore = new PgSession({
    conString: process.env.DATABASE_URL,
    createTableIfMissing: true,
    ttl: Math.floor(sessionTtl / 1000),
    tableName: "sessions",
  });

  app.set("trust proxy", 1);

  app.use(
    session({
      secret: process.env.SESSION_SECRET || "dev-secret-please-change",
      store: sessionStore,
      resave: false,
      saveUninitialized: false,
      cookie: {
        httpOnly: true,
        secure: process.env.NODE_ENV === "production",
        sameSite: process.env.NODE_ENV === "production" ? "lax" : false,
        maxAge: sessionTtl,
      },
    }),
  );

  // ── Local strategy ──────────────────────────────
  passport.use(
    new LocalStrategy(
      { usernameField: "email", passwordField: "password" },
      async (email, password, done) => {
        try {
          const [user] = await db
            .select()
            .from(users)
            .where(eq(users.email, email))
            .limit(1);

          if (!user) {
            return done(null, false, { message: "Credenciales inválidas" });
          }

          const isValid = await bcrypt.compare(password, user.password);
          if (!isValid) {
            return done(null, false, { message: "Credenciales inválidas" });
          }

          return done(null, {
            id: user.id,
            email: user.email,
            name: user.name,
            plan: user.plan,
            avatarUrl: user.avatarUrl,
          });
        } catch (err) {
          return done(err);
        }
      },
    ),
  );

  // ── Google OAuth strategy ───────────────────────
  if (process.env.GOOGLE_CLIENT_ID && process.env.GOOGLE_CLIENT_SECRET) {
    const appUrl = process.env.APP_URL || "http://localhost:5000";
    passport.use(
      new GoogleStrategy(
        {
          clientID: process.env.GOOGLE_CLIENT_ID,
          clientSecret: process.env.GOOGLE_CLIENT_SECRET,
          callbackURL: `${appUrl}/api/auth/google/callback`,
          scope: ["profile", "email", "https://www.googleapis.com/auth/calendar.events"],
          accessType: "offline",
          prompt: "consent",
        } as any,
        async (accessToken, refreshToken, profile, done) => {
          try {
            const email = profile.emails?.[0]?.value;
            if (!email) {
              return done(new Error("No email from Google account"));
            }

            // Check if user exists by googleId
            let [user] = await db
              .select()
              .from(users)
              .where(eq(users.googleId, profile.id))
              .limit(1);

            if (!user) {
              // Check if email already registered (link accounts)
              const [existing] = await db
                .select()
                .from(users)
                .where(eq(users.email, email))
                .limit(1);

              if (existing) {
                // Link Google to existing account
                [user] = await db
                  .update(users)
                  .set({
                    googleId: profile.id,
                    avatarUrl: profile.photos?.[0]?.value ?? existing.avatarUrl,
                    name: existing.name ?? profile.displayName,
                    googleAccessToken: accessToken,
                    googleRefreshToken: refreshToken ?? existing.googleRefreshToken,
                  })
                  .where(eq(users.id, existing.id))
                  .returning();
              } else {
                // Create new user
                const randomPassword = crypto.randomBytes(32).toString("hex");
                const hash = await bcrypt.hash(randomPassword, 10);
                [user] = await db
                  .insert(users)
                  .values({
                    email,
                    password: hash,
                    name: profile.displayName,
                    googleId: profile.id,
                    avatarUrl: profile.photos?.[0]?.value ?? null,
                    plan: "FREE",
                    googleAccessToken: accessToken,
                    googleRefreshToken: refreshToken ?? null,
                  })
                  .returning();
              }
            } else {
              // Update tokens for existing Google user
              [user] = await db
                .update(users)
                .set({
                  googleAccessToken: accessToken,
                  googleRefreshToken: refreshToken ?? user.googleRefreshToken,
                })
                .where(eq(users.id, user.id))
                .returning();
            }

            return done(null, {
              id: user.id,
              email: user.email,
              name: user.name,
              plan: user.plan,
              avatarUrl: user.avatarUrl,
            });
          } catch (err) {
            return done(err as Error);
          }
        },
      ),
    );
  }

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id: string, done) => {
    try {
      const [user] = await db
        .select()
        .from(users)
        .where(eq(users.id, id))
        .limit(1);
      if (!user) return done(null, false);
      done(null, {
        id: user.id,
        email: user.email,
        name: user.name,
        plan: user.plan,
        avatarUrl: user.avatarUrl,
      });
    } catch (err) {
      done(err);
    }
  });

  app.use(passport.initialize());
  app.use(passport.session());
}

export { passport, bcrypt };
