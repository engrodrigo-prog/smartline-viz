import { useState } from "react";
import { useToast } from "@/hooks/use-toast";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { supabase } from "@/integrations/supabase/client";
import { Link } from "react-router-dom";
import LanguageMenu from "@/components/LanguageMenu";
import { useI18n } from "@/context/I18nContext";

const SignupRequest = () => {
  const { toast } = useToast();
  const { t } = useI18n();
  const [fullName, setFullName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!supabase) {
      toast({ title: t("signupRequest.toasts.unavailable.title"), description: t("signupRequest.toasts.unavailable.description"), variant: "destructive" });
      return;
    }
    setLoading(true);
    try {
      const { error } = await supabase.from("signup_requests").insert({
        type: "new",
        full_name: fullName.trim(),
        email: email.trim(),
        phone: phone.trim(),
        status: "pending",
        // campo extra opcional
        notes: message?.trim() || null,
      } as any);
      if (error) throw error;
      toast({
        title: t("signupRequest.toasts.success.title"),
        description: t("signupRequest.toasts.success.description"),
      });
      setFullName("");
      setEmail("");
      setPhone("");
      setMessage("");
    } catch (err: any) {
      const code = err?.code as string | undefined;
      const rawMessage = (err?.message as string | undefined) ?? "";
      const normalized = rawMessage.toLowerCase();

      const friendly =
        code === "23505"
          ? t("signupRequest.errors.duplicate")
          : code === "42P01" || normalized.includes("relation") || normalized.includes("does not exist")
            ? t("signupRequest.errors.tableNotConfigured")
            : code === "42501" || normalized.includes("row-level security") || normalized.includes("permission")
              ? t("signupRequest.errors.permission")
              : null;

      toast({
        title: t("signupRequest.toasts.error.title"),
        description: friendly ?? err?.message ?? t("signupRequest.toasts.error.description"),
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-background px-4 relative">
      <div className="absolute top-4 right-4 z-20">
        <LanguageMenu className="bg-background/60 hover:bg-background/80 border border-border/50" />
      </div>
      <div className="tech-card w-full max-w-2xl p-8">
        <h1 className="text-2xl font-bold mb-2">{t("signupRequest.title")}</h1>
        <p className="text-sm text-muted-foreground mb-6">
          {t("signupRequest.subtitle")}
        </p>
        <form className="grid gap-4" onSubmit={handleSubmit}>
          <Input
            placeholder={t("signupRequest.form.fullName")}
            value={fullName}
            onChange={(e) => setFullName(e.target.value)}
            required
          />
          <Input
            type="email"
            placeholder={t("signupRequest.form.email")}
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            required
          />
          <Input
            placeholder={t("signupRequest.form.phone")}
            value={phone}
            onChange={(e) => setPhone(e.target.value)}
            required
          />
          <Textarea
            placeholder={t("signupRequest.form.message")}
            value={message}
            onChange={(e) => setMessage(e.target.value)}
            rows={3}
          />
          <Button type="submit" disabled={loading}>
            {loading ? t("signupRequest.form.sending") : t("signupRequest.form.submit")}
          </Button>
          <div className="text-center text-xs text-muted-foreground">
            <Link to="/" className="hover:underline">{t("signupRequest.links.backHome")}</Link>
          </div>
        </form>
      </div>
    </div>
  );
};

export default SignupRequest;
