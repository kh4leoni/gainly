import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Link from "next/link";

export default function SignupPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Rekisteröityminen pois käytöstä</CardTitle>
          <CardDescription>Uusien tilien luonti on estetty.</CardDescription>
        </CardHeader>
        <CardContent>
          <p className="text-sm text-muted-foreground">
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
