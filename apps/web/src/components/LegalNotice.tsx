import React from "react";
import { Link } from "react-router-dom";

export default function LegalNotice() {
  const year = new Date().getFullYear();

  return (
    <footer className="mt-6 border-t border-border/60 px-6 py-4 text-xs text-muted-foreground">
      <div>© {year} SmartLine™. Todos os direitos reservados.</div>
      <div className="mt-2 leading-relaxed">
        O conteúdo, imagens e dados apresentados são protegidos por direitos autorais e, quando aplicável, por segredo de negócio.
        O uso não autorizado, cópia, engenharia reversa, scraping ou redistribuição é proibido.
        Ao acessar, você concorda com os{" "}
        <Link to="/legal" className="underline hover:text-foreground transition-colors">
          Termos de Uso e Aviso Legal
        </Link>
        .
      </div>
    </footer>
  );
}
