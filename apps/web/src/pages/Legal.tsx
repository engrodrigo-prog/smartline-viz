import React from "react";

export default function Legal() {
  return (
    <main
      style={{
        maxWidth: 960,
        margin: "40px auto",
        padding: "0 16px",
        lineHeight: 1.6,
      }}
    >
      <h1>Termos de Uso e Aviso Legal</h1>
      <p>
        <strong>Direitos Autorais:</strong> © {new Date().getFullYear()} SmartLine™. Todos os direitos reservados.
      </p>
      <p>
        O software, código-fonte, modelos, algoritmos, designs, imagens e dados são protegidos pela legislação de
        propriedade intelectual aplicável. É proibida a cópia, modificação, engenharia reversa, distribuição, ou criação de
        obras derivadas sem autorização expressa.
      </p>
      <p>
        <strong>Dados e Privacidade:</strong> dados sensíveis e arquivos brutos (ex.: GeoTIFF, nuvens de pontos, relatórios) são
        armazenados em ambientes controlados e podem exigir autenticação ou contrato específico.
      </p>
      <p>
        <strong>Uso Autorizado:</strong> o acesso à aplicação destina-se a demonstrações, avaliação técnica e/ou uso interno do
        cliente, conforme contrato. Qualquer uso diverso deve ser previamente autorizado.
      </p>
      <p>
        <strong>Responsabilidade:</strong> a SmartLine™ envida melhores esforços para manter acurácia e disponibilidade, sem
        garantias de qualquer natureza, implícitas ou explícitas, salvo quando pactuado contratualmente.
      </p>
      <p>
        <strong>Contato:</strong> para autorização de uso, contratos, denúncias de uso indevido ou dúvidas jurídicas, entre em
        contato com o time SmartLine™.
      </p>
    </main>
  );
}

