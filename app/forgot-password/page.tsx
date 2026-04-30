import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { ForgotPasswordForm } from "@/components/auth/forgot-password-form";
import Link from "next/link";

export default function ForgotPasswordPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Unohditko salasanan?</CardTitle>
          <CardDescription>Syötä sähköpostiosoitteesi, niin lähetämme palautuslinkin.</CardDescription>
        </CardHeader>
        <CardContent>
          <ForgotPasswordForm />
          <p className="mt-4 text-sm text-muted-foreground">
            <Link href="/login" className="underline">
              Takaisin kirjautumiseen
            </Link>
          </p>
        </CardContent>
      </Card>
    </main>
  );
}
