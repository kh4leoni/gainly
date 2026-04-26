import { LoginForm } from "@/components/auth/login-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";
import Image from "next/image";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const sp = await searchParams;
  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-6">
      <Card className="w-full">
        <CardHeader className="items-center">
          <Image src="/logo.png" alt="Gainly" width={140} height={56} className="mb-2 dark:invert" style={{ objectFit: "contain" }} />
          <CardTitle>Kirjaudu Gainlyyn</CardTitle>
          <CardDescription>Tervetuloa takaisin.</CardDescription>
        </CardHeader>
        <CardContent>
          <LoginForm next={sp.next} />
          <p className="mt-4 text-sm text-muted-foreground">
            Uusi käyttäjä?{" "}
            <Link href="/signup" className="underline">
              Luo tili
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
