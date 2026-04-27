import { Card, CardContent, CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { UpdatePasswordForm } from "@/components/auth/update-password-form";

export default function UpdatePasswordPage() {
  return (
    <main className="mx-auto flex min-h-screen max-w-md items-center px-6">
      <Card className="w-full">
        <CardHeader>
          <CardTitle>Tervetuloa Gainlyyn</CardTitle>
          <CardDescription>Vahvista nimesi ja aseta salasana tilillesi.</CardDescription>
        </CardHeader>
        <CardContent>
          <UpdatePasswordForm />
        </CardContent>
      </Card>
    </main>
  );
}
