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

export async function createUserSession(userID: string, redirectTo: string) {
  let session = await storage.getSession();
  session.set("userID", userID);

  return redirect(redirectTo, {
    headers: {
      "Set-Cookie": await storage.commitSession(session),
    },
  });
}
