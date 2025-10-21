import React from "react";
import { Link } from "react-router-dom";

export default function LegalNotice() {
  return (
    <footer
      className="legal-notice"
      style={{
        padding: "16px",
        fontSize: 12,
        color: "#666",
        borderTop: "1px solid #eee",
        marginTop: 24,
      }}
    >
      <div>© {new Date().getFullYear()} SmartLine™. Todos os direitos reservados.</div>
      <div style={{ marginTop: 4 }}>
        O conteúdo, imagens e dados apresentados são protegidos por direitos autorais e, quando aplicável, por segredo de negócio.
        O uso não autorizado, cópia, engenharia reversa, scraping ou redistribuição é proibido.
        Ao acessar, você concorda com os{" "}
        <Link to="/legal" style={{ textDecoration: "underline" }}>
          Termos de Uso e Aviso Legal
        </Link>
        .
      </div>
    </footer>
  );
}
