import { Link } from "react-router-dom";
import { FileText, ArrowLeft } from "lucide-react";

const sections = [
  {
    title: "1. Aceitacao dos Termos",
    content: `Ao aceder e utilizar a plataforma SuperLojas ("Plataforma"), o utilizador aceita e concorda com os presentes Termos de Uso. Se nao concordar com algum dos termos aqui estabelecidos, nao devera utilizar a Plataforma.

A SuperLojas reserva-se o direito de actualizar ou modificar estes Termos a qualquer momento, sem aviso previo. O uso continuado da Plataforma apos quaisquer alteracoes constitui aceitacao dos novos termos.`,
  },
  {
    title: "2. Sobre a Plataforma",
    content: `A SuperLojas e um marketplace online que conecta vendedores (donos de lojas) a compradores em Angola. A Plataforma serve como intermediario, facilitando a descoberta de produtos e o contacto entre as partes.

A SuperLojas NAO e responsavel pela transaccao comercial entre comprador e vendedor, incluindo qualidade dos produtos, entrega, pagamento ou qualquer outro aspecto da relacao comercial entre as partes.`,
  },
  {
    title: "3. Registo e Conta",
    content: `Para utilizar determinadas funcionalidades da Plataforma, o utilizador devera criar uma conta fornecendo informacoes verdadeiras, completas e actualizadas.

O utilizador e responsavel por:
• Manter a confidencialidade da sua senha e dados de acesso
• Todas as actividades realizadas com a sua conta
• Notificar imediatamente a SuperLojas em caso de uso nao autorizado da conta

A SuperLojas reserva-se o direito de suspender ou encerrar contas que violem estes termos.`,
  },
  {
    title: "4. Vendedores (Donos de Lojas)",
    content: `Os vendedores que registam lojas na Plataforma comprometem-se a:
• Fornecer informacoes verdadeiras sobre si e os seus produtos
• Cumprir com toda a legislacao angolana aplicavel ao comercio electronico
• Responder atempadamente as solicitacoes dos compradores
• Manter os precos e disponibilidade dos produtos actualizados
• Nao publicar produtos ilegais, falsificados ou que violem direitos de terceiros

A SuperLojas reserva-se o direito de remover lojas ou produtos que violem estas regras, sem aviso previo.`,
  },
  {
    title: "5. Compradores",
    content: `Os compradores devem:
• Utilizar a Plataforma de boa fe
• Verificar os detalhes dos produtos directamente com o vendedor antes de efectuar pagamentos
• Nao utilizar a Plataforma para fins fraudulentos

A comunicacao e transaccao entre comprador e vendedor e feita directamente (via WhatsApp ou outro canal). A SuperLojas nao participa nem garante estas transaccoes.`,
  },
  {
    title: "6. Propriedade Intelectual",
    content: `Todo o conteudo da Plataforma, incluindo mas nao limitado a textos, graficos, logotipos, icones, imagens, software e codigo, e propriedade da SuperLojas ou dos seus licenciadores e esta protegido pelas leis de propriedade intelectual.

Os vendedores sao responsaveis pelo conteudo que publicam e declaram ter os direitos necessarios sobre as imagens e descricoes dos seus produtos.`,
  },
  {
    title: "7. Limitacao de Responsabilidade",
    content: `A SuperLojas nao se responsabiliza por:
• Qualidade, seguranca ou legalidade dos produtos anunciados
• Veracidade das informacoes fornecidas pelos vendedores
• Capacidade dos vendedores em concluir transaccoes
• Danos directos ou indirectos resultantes do uso da Plataforma
• Interrupcoes no servico por motivos tecnicos ou de forca maior

A Plataforma e fornecida "tal como esta" e "conforme disponivel", sem garantias de qualquer tipo.`,
  },
  {
    title: "8. Resolucao de Conflitos",
    content: `Em caso de disputa entre comprador e vendedor, as partes devem tentar resolver o conflito directamente entre si. A SuperLojas pode, a seu criterio, mediar conflitos mas nao e obrigada a faze-lo.

Qualquer disputa relacionada com estes Termos sera regida pelas leis da Republica de Angola e submetida aos tribunais competentes de Luanda.`,
  },
  {
    title: "9. Contacto",
    content: `Para questoes relacionadas com estes Termos de Uso, entre em contacto connosco:
• Email: info@superlojas.ao
• WhatsApp: +244 923 456 789
• Endereco: Luanda, Angola`,
  },
];

export default function Terms() {
  return (
    <main className="min-h-screen bg-secondary/30">
      <div className="bg-hero-gradient py-12 sm:py-16">
        <div className="container text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="h-11 w-11 rounded-xl bg-card/20 backdrop-blur flex items-center justify-center">
              <FileText className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-primary-foreground">Termos de Uso</h1>
          </div>
          <p className="text-primary-foreground/80 text-sm max-w-lg mx-auto">
            Leia atentamente os termos e condicoes de utilizacao da plataforma SuperLojas.
          </p>
          <p className="text-primary-foreground/60 text-xs mt-2">Ultima actualizacao: Marco 2026</p>
        </div>
      </div>

      <div className="container py-10 max-w-3xl">
        <div className="rounded-2xl bg-card border border-border overflow-hidden">
          {sections.map((section, i) => (
            <div key={i} className={`p-6 ${i < sections.length - 1 ? "border-b border-border" : ""}`}>
              <h2 className="text-sm font-bold mb-3">{section.title}</h2>
              <div className="text-sm text-muted-foreground leading-relaxed whitespace-pre-line">{section.content}</div>
            </div>
          ))}
        </div>

        <div className="mt-8 text-center">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Voltar ao inicio
          </Link>
        </div>
      </div>
    </main>
  );
}
