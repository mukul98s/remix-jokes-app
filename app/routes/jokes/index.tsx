import type {LoaderFunction} from "@remix-run/node";
import type {Joke} from "@prisma/client";
import {useLoaderData} from "@remix-run/react";
import {db} from "~/utils/db.server";

type LoaderData = {randomJoke: Joke};
export const loader: LoaderFunction = async () => {
  const count = await db.joke.count();
  const randomNumber = Math.floor(Math.random() * count);

  const [randomJoke] = await db.joke.findMany({
    take: 1,
    skip: randomNumber,
  });

  const data: LoaderData = {randomJoke};
  return data;
};

export default function JokesIndexRoute() {
  const data = useLoaderData<LoaderData>();

  return (
    <div>
      <p>Here's a random joke:</p>
      <p>{data.randomJoke.content}</p>
    </div>
  );
}

export function ErrorBoundary() {
  return <div className="error-container">I did a whoopsies.</div>;
}
