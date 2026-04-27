"use client";

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function UpdatePasswordForm() {
  const router = useRouter();
  const [fullName, setFullName] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    createClient().auth.getUser().then(({ data }) => {
      const name = (data.user?.user_metadata as { full_name?: string })?.full_name;
      if (name) setFullName(name);
    });
  }, []);

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (!fullName.trim()) {
      setError("Syötä nimesi.");
      return;
    }
    if (password !== confirm) {
      setError("Salasanat eivät täsmää.");
      return;
    }
    if (password.length < 8) {
      setError("Salasanan tulee olla vähintään 8 merkkiä.");
      return;
    }
    setLoading(true);
    const supabase = createClient();
    const { error: updateError } = await supabase.auth.updateUser({
      password,
      data: { full_name: fullName.trim() },
    });
    if (updateError) {
      setLoading(false);
      setError(updateError.message);
      return;
    }
    const { data: { user } } = await supabase.auth.getUser();
    if (user) {
      await supabase.from("profiles").update({ full_name: fullName.trim() }).eq("id", user.id);
    }
    const { data } = await supabase.auth.getSession();
    const role =
      (data.session?.user.app_metadata as { user_role?: string })?.user_role ??
      (data.session?.user.user_metadata as { role?: string })?.role ??
      "client";
    setLoading(false);
    router.replace(role === "coach" ? "/coach/dashboard" : "/client/dashboard");
    router.refresh();
  }

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label htmlFor="full-name">Koko nimi</Label>
        <Input
          id="full-name"
          type="text"
          autoComplete="name"
          placeholder="Etunimi Sukunimi"
          value={fullName}
          onChange={(e) => setFullName(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="password">Uusi salasana</Label>
        <Input
          id="password"
          type="password"
          autoComplete="new-password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
        />
      </div>
      <div>
        <Label htmlFor="confirm">Vahvista salasana</Label>
        <Input
          id="confirm"
          type="password"
          autoComplete="new-password"
          value={confirm}
          onChange={(e) => setConfirm(e.target.value)}
        />
      </div>
      {error && <p className="text-sm text-destructive">{error}</p>}
      <Button type="submit" disabled={loading} className="w-full">
        {loading ? "Tallennetaan…" : "Aseta salasana"}
      </Button>
    </form>
  );
}
