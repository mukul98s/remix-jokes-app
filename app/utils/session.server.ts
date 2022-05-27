import {db} from "./db.server";
import bcrypt from "bcryptjs";
import {createCookieSessionStorage, redirect} from "@remix-run/node";

type LoginForm = {
  username: string;
  password: string;
};

export async function login({username, password}: LoginForm) {
  const user = await db.user.findFirst({where: {username}});
  if (!user) return null;

  const passwordMatch = await bcrypt.compare(password, user.passwordHash);
  if (!passwordMatch) return null;

  return user;
}

let sessionSecret = process.env.SESSISON_SECRET;
if (!sessionSecret) {
  throw new Error("There must be a session secret in environment");
}

let storage = createCookieSessionStorage({
  cookie: {
    secure: true,
    httpOnly: true,
    sameSite: "lax",
    maxAge: 60 * 60 * 24 * 7, // 7 days
    path: "/",
    name: "RJ_PRIMER",
    secrets: [sessionSecret],
  },
});

export async function createUserSession(userId: string, redirectTo: string) {
  const session = await storage.getSession();
  session.set("userId", userId);
  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": await storage.commitSession(session),
    },
  });
}

function getUserSession(request: Request) {
  return storage.getSession(request.headers.get("cookie"));
}

export async function getUserId(request: Request) {
  const session = await getUserSession(request);
  const userId = session.get("userId");
  if (!userId || typeof userId !== "string") return null;
  return userId;
}

export async function requireUserId(
  request: Request,
  redirectTo: string = new URL(request.url).pathname
) {
  const session = await getUserSession(request);
  const userId = session.get("userId");
  if (!userId || typeof userId !== "string") {
    const searchParams = new URLSearchParams([["redirectTo", redirectTo]]);
    throw redirect(`/login?${searchParams}`);
  }
  return userId;
}

export async function getUser(request: Request) {
  let userId = await getUserId(request);
  if (!userId) return null;

  return db.user.findUnique({
    where: {id: userId},
    select: {id: true, username: true},
  });
}

export async function logout(request: Request) {
  let session = await getUserSession(request);

  return redirect("/login", {
    headers: {
      "Set-Cookie": await storage.destroySession(session),
    },
  });
}

export async function register({username, password}: LoginForm) {
  const hasedPassword = await bcrypt.hash(password, 12);

  const user = await db.user.create({
    data: {username, passwordHash: hasedPassword},
  });

  return {id: user.id, username};
}
