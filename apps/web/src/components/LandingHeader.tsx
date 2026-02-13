import { useState } from "react";
import { Link } from "react-router-dom";
import logoSmartline from "@/assets/logo-smartline.png";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { useToast } from "@/hooks/use-toast";
import { ENV } from "@/config/env";
import LanguageMenu from "@/components/LanguageMenu";
import { useI18n } from "@/context/I18nContext";
import { Sheet, SheetClose, SheetContent, SheetHeader, SheetTitle, SheetTrigger } from "@/components/ui/sheet";
import { Menu } from "lucide-react";

const LandingHeader = () => {
  const [showContact, setShowContact] = useState(false);
  const { toast } = useToast();
  const [showSurvey, setShowSurvey] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const { t } = useI18n();
  const mailtoSubject = t("landingHeader.mailto.subject");
  const mailtoBody = t("landingHeader.mailto.body");
  const mailto = `mailto:${ENV.CONTACT_EMAIL}?subject=${encodeURIComponent(mailtoSubject)}&body=${encodeURIComponent(mailtoBody)}`;

  const handleSubmitContact = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    toast({
      title: t("landingHeader.contact.toast.title"),
      description: t("landingHeader.contact.toast.description"),
    });
    setShowContact(false);
  };

  return (
    <>
      <header className="fixed top-0 left-0 w-full bg-slate-900/70 backdrop-blur-2xl border-b border-white/10 shadow-lg shadow-black/10 z-50">
        <div className="max-w-7xl mx-auto flex items-center justify-between gap-6 px-6 md:px-10 min-h-[80px]">
          <div className="flex items-center gap-3">
            <img src={logoSmartline} alt="Smartline" className="h-10" />
            <span className="text-lg sm:text-2xl font-semibold tracking-wide text-white/90 select-none">
              Smartline AssetHealth
            </span>
          </div>

          <div className="flex items-center gap-2 md:gap-4">
            <LanguageMenu className="text-white/80 hover:text-white hover:bg-white/10" />
            <div className="md:hidden">
              <Sheet open={mobileMenuOpen} onOpenChange={setMobileMenuOpen}>
                <SheetTrigger asChild>
                  <Button type="button" variant="ghost" size="icon" className="text-white/90 hover:bg-white/10">
                    <Menu className="h-5 w-5" />
                    <span className="sr-only">Menu</span>
                  </Button>
                </SheetTrigger>
                <SheetContent side="right" className="bg-slate-950/95 border-white/10">
                  <SheetHeader>
                    <SheetTitle className="text-white/90">Smartline</SheetTitle>
                  </SheetHeader>
                  <div className="mt-6 flex flex-col gap-2">
                    <SheetClose asChild>
                      <Button asChild variant="default" className="justify-start">
                        <Link to="/login">{t("landingHeader.nav.login")}</Link>
                      </Button>
                    </SheetClose>

                    <SheetClose asChild>
                      <Button asChild variant="outline" className="justify-start">
                        <Link to="/resultados">{t("landingHeader.nav.results")}</Link>
                      </Button>
                    </SheetClose>

                    <SheetClose asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        className="justify-start text-white/90 hover:bg-white/10"
                        onClick={() => setShowSurvey(true)}
                      >
                        {t("landingHeader.nav.study")}
                      </Button>
                    </SheetClose>

                    <SheetClose asChild>
                      <Button
                        type="button"
                        variant="ghost"
                        className="justify-start text-white/90 hover:bg-white/10"
                        onClick={() => setShowContact(true)}
                      >
                        {t("landingHeader.nav.contacts")}
                      </Button>
                    </SheetClose>
                  </div>
                </SheetContent>
              </Sheet>
            </div>
            <nav className="hidden md:flex justify-end items-center gap-10 text-base font-medium text-white/90">
              <button
                onClick={() => setShowSurvey(true)}
                className="hover:text-green-400 transition-colors"
              >
                {t("landingHeader.nav.study")}
              </button>

              <button
                onClick={() => setShowContact(true)}
                className="hover:text-green-400 transition-colors"
              >
                {t("landingHeader.nav.contacts")}
              </button>

              <Link to="/resultados" className="hover:text-green-400 transition-colors">
                {t("landingHeader.nav.results")}
              </Link>

              <Link
                to="/login"
                className="px-4 py-1.5 text-sm rounded-xl bg-green-500/30 border border-green-400/40 hover:bg-green-500/40 hover:shadow-[0_0_10px_rgba(0,255,170,0.3)] transition-all"
              >
                {t("landingHeader.nav.login")}
              </Link>
            </nav>
          </div>
        </div>
      </header>

      <Dialog open={showContact} onOpenChange={setShowContact}>
        <DialogContent className="bg-card/95 backdrop-blur-xl border-border w-[95vw] sm:max-w-3xl lg:max-w-4xl">
          <DialogHeader>
            <DialogTitle className="text-2xl text-primary">{t("landingHeader.contact.title")}</DialogTitle>
          </DialogHeader>
          <form onSubmit={handleSubmitContact} className="flex flex-col gap-4 mt-4">
            <Input
              type="text"
              placeholder={t("landingHeader.contact.form.fullName")}
              required
              className="bg-input border-border"
            />
            <Input
              type="email"
              placeholder={t("landingHeader.contact.form.email")}
              required
              className="bg-input border-border"
            />
            <Input
              type="text"
              placeholder={t("landingHeader.contact.form.company")}
              required
              className="bg-input border-border"
            />
            <Input
              type="tel"
              placeholder={t("landingHeader.contact.form.phone")}
              required
              className="bg-input border-border"
            />
            
            <select 
              className="flex h-10 w-full rounded-md border border-border bg-input px-3 py-2 text-sm ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2" 
              name="comoConheceu" 
              required
            >
              <option value="">{t("landingHeader.contact.form.howDidYouHear.placeholder")}</option>
              <option>{t("landingHeader.contact.form.howDidYouHear.options.linkedin")}</option>
              <option>{t("landingHeader.contact.form.howDidYouHear.options.events")}</option>
              <option>{t("landingHeader.contact.form.howDidYouHear.options.direct")}</option>
              <option>{t("landingHeader.contact.form.howDidYouHear.options.email")}</option>
              <option>{t("landingHeader.contact.form.howDidYouHear.options.google")}</option>
              <option>{t("landingHeader.contact.form.howDidYouHear.options.sector")}</option>
              <option>{t("landingHeader.contact.form.howDidYouHear.options.other")}</option>
            </select>

            <Textarea
              name="mensagem"
              className="bg-input border-border min-h-[120px]"
              maxLength={300}
              placeholder={t("landingHeader.contact.form.message")}
            />

            <Button type="submit" className="btn-primary mt-2">
              {t("landingHeader.contact.form.submit")}
            </Button>

            <p className="text-xs text-muted-foreground text-center">
              {t("landingHeader.contact.form.preferEmail")}{" "}
              <a className="text-primary underline" href={mailto}>
                {t("landingHeader.contact.form.sendTo", { email: ENV.CONTACT_EMAIL })}
              </a>
            </p>
          </form>
        </DialogContent>
      </Dialog>

      <Dialog open={showSurvey} onOpenChange={setShowSurvey}>
        <DialogContent className="bg-card/95 backdrop-blur-xl border-border w-[95vw] sm:max-w-3xl lg:max-w-4xl" aria-describedby={undefined}>
          <DialogHeader>
            <DialogTitle className="text-2xl text-primary">{t("landingHeader.survey.title")}</DialogTitle>
          </DialogHeader>
          <div className="h-[80vh]">
            <iframe
              title={t("landingHeader.survey.iframeTitle")}
              src="https://form.jotform.com/251775321495058"
              className="w-full h-full rounded-md border"
              allowFullScreen
              loading="lazy"
            />
          </div>
        </DialogContent>
      </Dialog>
    </>
  );
};

export default LandingHeader;
