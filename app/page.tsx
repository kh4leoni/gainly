import Link from "next/link";
import { Button } from "@/components/ui/button";

export default function LandingPage() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-20">
      <h1 className="text-4xl font-bold tracking-tight sm:text-5xl">Gainly</h1>
      <p className="mt-4 text-lg text-muted-foreground">
        Voimaharjoitteluvalmennus valmentajille ja asiakkaille, jotka haluavat rakennetta, palautetta ja edistymisen seuraamista ilman hankausta. Offline-ensimmäinen. Reaaliaikainen viestintä. Automaattinen PR-tunnistus.
      </p>

      <div className="mt-10 flex gap-3">
        <Button asChild>
          <Link href="/login">Aloita</Link>
        </Button>
        <Button asChild variant="outline">
          <Link href="/login">Kirjaudu sisään</Link>
        </Button>
      </div>

      <section className="mt-16 grid gap-6 sm:grid-cols-3">
        <Feature title="Ohjelmien rakentaja" body="Vedä ja pudota viikkoja, päiviä ja harjoituksia toistoilla, sarjoilla ja intensiteetillä." />
        <Feature title="Offline-lokit" body="Kirjaa treenit ilman yhteyttä. Kaikki synkronoituu heti kun olet takaisin." />
        <Feature title="Reaaliaikainen" body="Valmentaja näkee PR:t ja viestit samoin kuin ne tapahtuvat." />
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
