import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Gainly</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        Strength coaching built for coaches and clients who want structure, feedback and progress tracking
        without friction. Offline-first. Real-time messaging. Automatic PR detection.
      </p>

      <div className="mt-10 flex gap-3">
        <Button asChild>
          <Link href="/signup">Get started</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/login">Log in</Link>
        </Button>
      </div>

      <section className="mt-16 grid gap-6 sm:grid-cols-3">
        <Feature title="Program builder" body="Drag-drop weeks, days and exercises with reps, sets and intensity." />
        <Feature title="Offline logging" body="Log workouts without signal. Everything syncs the moment you're back." />
        <Feature title="Real-time" body="Coach sees PRs and messages the instant they happen." />
      </section>
    </main>
  );
}

function Feature({ title, body }: { title: string; body: string }) {
  return (
    <div className="rounded-lg border p-4">
      <h2 className="font-semibold">{title}</h2>
      <p className="mt-2 text-sm text-muted-foreground">{body}</p>
    </div>
  );
}
