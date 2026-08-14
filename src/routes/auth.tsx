import { createFileRoute, Link, useNavigate } from "@tanstack/react-router";
import { useEffect, useState } from "react";
import { toast } from "sonner";
import { supabase } from "@/integrations/supabase/client";
import { lovable } from "@/integrations/lovable/index";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

export const Route = createFileRoute("/auth")({
  head: () => ({
    meta: [
      { title: "Entrar no Life Hub" },
      { name: "description", content: "Acesse seu Life Hub: hábitos, treino, finanças e metas." },
      { property: "og:title", content: "Entrar no Life Hub" },
      { property: "og:description", content: "Acesse seu painel pessoal do Life Hub." },
    ],
  }),
  component: AuthPage,
});

type Mode = "login" | "signup" | "reset";

function AuthPage() {
  const navigate = useNavigate();
  const [mode, setMode] = useState<Mode>("login");
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) navigate({ to: "/hoje", replace: true });
    });
  }, [navigate]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    setLoading(true);
    try {
      if (mode === "signup") {
        const { error } = await supabase.auth.signUp({
          email,
          password,
          options: {
            data: { name },
            emailRedirectTo: `${window.location.origin}/hoje`,
          },
        });
        if (error) throw error;
        toast.success("Conta criada! Bem-vindo ao Life Hub.");
        navigate({ to: "/hoje", replace: true });
      } else if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) throw error;
        navigate({ to: "/hoje", replace: true });
      } else {
        const { error } = await supabase.auth.resetPasswordForEmail(email, {
          redirectTo: `${window.location.origin}/redefinir-senha`,
        });
        if (error) throw error;
        toast.success("Enviamos um link de recuperação para o seu e-mail.");
        setMode("login");
      }
    } catch (err) {
      toast.error((err as Error).message);
    } finally {
      setLoading(false);
    }
  }

  async function google() {
    setLoading(true);
    const result = await lovable.auth.signInWithOAuth("google", {
      redirect_uri: window.location.origin,
    });
    if (result.error) {
      setLoading(false);
      toast.error("Não foi possível entrar com o Google.");
      return;
    }
    if (result.redirected) return;
    navigate({ to: "/hoje", replace: true });
  }

  return (
    <main className="flex min-h-screen items-center justify-center px-5 py-12">
      <div className="w-full max-w-sm">
        <Link to="/" className="text-sm text-muted-foreground">
          ← Life Hub
        </Link>
        <h1 className="mt-6 text-2xl font-semibold">
          {mode === "signup"
            ? "Criar sua conta"
            : mode === "reset"
              ? "Recuperar senha"
              : "Entrar"}
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          {mode === "reset"
            ? "Enviaremos um link para redefinir sua senha."
            : "Seus dados ficam salvos e privados."}
        </p>

        <form onSubmit={submit} className="mt-8 space-y-4">
          {mode === "signup" && (
            <div className="space-y-1.5">
              <Label htmlFor="name">Nome</Label>
              <Input id="name" value={name} onChange={(e) => setName(e.target.value)} required />
            </div>
          )}
          <div className="space-y-1.5">
            <Label htmlFor="email">E-mail</Label>
            <Input
              id="email"
              type="email"
              autoComplete="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          {mode !== "reset" && (
            <div className="space-y-1.5">
              <Label htmlFor="password">Senha</Label>
              <Input
                id="password"
                type="password"
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                minLength={6}
                required
              />
            </div>
          )}
          <Button type="submit" className="w-full" size="lg" disabled={loading}>
            {loading
              ? "Aguarde..."
              : mode === "signup"
                ? "Criar conta"
                : mode === "reset"
                  ? "Enviar link"
                  : "Entrar"}
          </Button>
        </form>

        {mode !== "reset" && (
          <>
            <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
              <span className="h-px flex-1 bg-border" /> ou <span className="h-px flex-1 bg-border" />
            </div>
            <Button variant="outline" className="w-full" size="lg" onClick={google} disabled={loading}>
              Continuar com Google
            </Button>
          </>
        )}

        <div className="mt-6 space-y-2 text-sm text-muted-foreground">
          {mode === "login" && (
            <>
              <button className="underline-offset-4 hover:underline" onClick={() => setMode("signup")}>
                Não tenho conta — criar agora
              </button>
              <br />
              <button className="underline-offset-4 hover:underline" onClick={() => setMode("reset")}>
                Esqueci minha senha
              </button>
            </>
          )}
          {mode !== "login" && (
            <button className="underline-offset-4 hover:underline" onClick={() => setMode("login")}>
              Voltar para o login
            </button>
          )}
        </div>
      </div>
    </main>
  );
}
