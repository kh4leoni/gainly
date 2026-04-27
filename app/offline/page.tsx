export const dynamic = "force-static";

export default function OfflinePage() {
  return (
    <main className="flex min-h-dvh flex-col items-center justify-center px-6 text-center">
      <h1 className="text-2xl font-semibold">Offline</h1>
      <p className="mt-2 max-w-sm text-sm text-muted-foreground">
        Ei verkkoyhteyttä. Voit jatkaa salin lokitusta — tiedot synkronoituvat,
        kun yhteys palaa.
      </p>
    </main>
  );
}
