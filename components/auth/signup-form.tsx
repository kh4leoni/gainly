"use client";

import { useForm } from "react-hook-form";
import { zodResolver } from "@hookform/resolvers/zod";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { SignupSchema, type SignupInput } from "@/lib/schemas";
import { createClient } from "@/lib/supabase/client";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export function SignupForm() {
  const router = useRouter();
  const [serverError, setServerError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<SignupInput>({
    resolver: zodResolver(SignupSchema),
    defaultValues: { role: "client" },
  });
  const role = watch("role");

  const onSubmit = handleSubmit(async (values) => {
    setServerError(null);
    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email: values.email,
      password: values.password,
      options: {
        data: { role: values.role, full_name: values.full_name },
      },
    });
    if (error) {
      setServerError(error.message);
      return;
    }
    router.push("/");
    router.refresh();
  });

  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <div>
        <Label>I am a…</Label>
        <div className="mt-1 grid grid-cols-2 gap-2">
          {(["coach", "client"] as const).map((r) => (
            <button
              key={r}
              type="button"
              onClick={() => setValue("role", r, { shouldValidate: true })}
              className={`rounded-md border p-3 text-sm font-medium transition ${
                role === r ? "border-primary bg-primary/5" : "border-input hover:bg-accent"
              }`}
            >
              {r === "coach" ? "Coach" : "Client"}
            </button>
          ))}
        </div>
      </div>

      <div>
        <Label htmlFor="full_name">Full name</Label>
        <Input id="full_name" autoComplete="name" {...register("full_name")} />
        {errors.full_name && <p className="mt-1 text-sm text-destructive">{errors.full_name.message}</p>}
      </div>

      <div>
        <Label htmlFor="email">Email</Label>
        <Input id="email" type="email" autoComplete="email" {...register("email")} />
        {errors.email && <p className="mt-1 text-sm text-destructive">{errors.email.message}</p>}
      </div>

      <div>
        <Label htmlFor="password">Password</Label>
        <Input id="password" type="password" autoComplete="new-password" {...register("password")} />
        {errors.password && <p className="mt-1 text-sm text-destructive">{errors.password.message}</p>}
      </div>

      {serverError && <p className="text-sm text-destructive">{serverError}</p>}

      <Button type="submit" disabled={isSubmitting} className="w-full">
        {isSubmitting ? "Creating account…" : "Create account"}
      </Button>
    </form>
  );
}
