import { SignupForm } from "@/components/auth/signup-form";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function SignupPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Luo Gainly-tili</CardTitle>
          <CardDescription>Valitse, valmennatko vai treenaatko.</CardDescription>
        </CardHeader>
        <CardContent>
          <SignupForm />
          <p className="mt-4 text-sm text-muted-foreground">
            Onko sinulla jo tili?{" "}
            <Link href="/login" className="underline">
              Kirjaudu sisään
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
