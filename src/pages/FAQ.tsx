import { useState } from "react";
import { Link } from "react-router-dom";
import { HelpCircle, ChevronDown, ShoppingCart, Store, CreditCard, Truck, Shield, UserCheck, ArrowLeft, MessageCircle } from "lucide-react";

interface FAQItem { q: string; a: string; }

const categories = [
  {
    label: "Compras",
    icon: ShoppingCart,
    color: "text-blue-500",
    bg: "bg-blue-50",
    items: [
      { q: "Como faco uma compra no SuperLoja?", a: "Navegue pelos produtos ou lojas, encontre o que deseja e clique no botao de WhatsApp para contactar directamente o vendedor. Combine os detalhes de pagamento e entrega com ele." },
      { q: "Preciso criar conta para comprar?", a: "Não e obrigatório criar conta para navegar pelos produtos. Porem, com uma conta pode guardar favoritos, acompanhar o histórico e ter uma melhor experiencia." },
      { q: "Posso comprar produtos de lojas diferentes?", a: "Sim! Pode adicionar produtos de varias lojas ao carrinho. Porem, como cada loja e independente, a entrega e pagamento serão combinados separadamente com cada vendedor." },
      { q: "Os preços incluem entrega?", a: "Geralmente não. O preço exibido e do produto. O custo de entrega e combinado directamente com o vendedor, pois depende da localização e forma de envio." },
      { q: "Posso negociar o preço?", a: "Depende do vendedor. Ao contactar via WhatsApp, pode perguntar sobre descontos, especialmente para compras em quantidade." },
    ],
  },
  {
    label: "Pagamentos",
    icon: CreditCard,
    color: "text-violet-500",
    bg: "bg-violet-50",
    items: [
      { q: "Quais formas de pagamento sao aceites?", a: "O pagamento e combinado directamente com o vendedor. As formas mais comuns sao: Multicaixa Express (transferência), pagamento na entrega (contra-entrega), depósito bancario e pagamento em dinheiro na recolha." },
      { q: "O pagamento e feito pela plataforma?", a: "Não. O SuperLoja e um marketplace que conecta compradores e vendedores. O pagamento e feito directamente ao vendedor, sem intermediacao da plataforma." },
      { q: "E seguro pagar antes de receber?", a: "Recomendamos o pagamento na entrega sempre que possível. Se pagar antecipadamente, guarde o comprovativo e confirme todos os detalhes com o vendedor via WhatsApp." },
    ],
  },
  {
    label: "Entregas",
    icon: Truck,
    color: "text-emerald-500",
    bg: "bg-emerald-50",
    items: [
      { q: "Como funciona a entrega?", a: "A entrega e combinada directamente entre comprador e vendedor. Pode ser: entrega ao domicilio (o vendedor leva até si), recolha na loja (você vai buscar) ou envio por transportadora." },
      { q: "Quanto tempo demora a entrega?", a: "Depende da loja e da sua localização. Lojas na mesma cidade geralmente entregam em 1-3 dias. Para outras províncias, pode demorar mais. Confirme o prazo com o vendedor." },
      { q: "Entregam fora de Luanda?", a: "Depende da loja. Muitas lojas enviam para outras províncias via transportadora. Verifique com o vendedor se faz envio para a sua localização." },
    ],
  },
  {
    label: "Lojas e Vendedores",
    icon: Store,
    color: "text-orange-500",
    bg: "bg-orange-50",
    items: [
      { q: "Como abrir uma loja no SuperLoja?", a: "Crie uma conta, aceda a página 'Abrir Minha Loja' e preencha os dados em 3 passos simples. A sua loja sera analisada e aprovada pela nossa equipa. E 100% gratuito!" },
      { q: "Quanto custa ter uma loja?", a: "O registo e uso da plataforma e totalmente gratuito. Não cobramos taxas de inscricao nem comissoes sobre as vendas." },
      { q: "Quanto tempo demora a aprovação?", a: "A nossa equipa analisa cada loja em até 48 horas. Receberá uma notificação assim que a sua loja for aprovada." },
      { q: "Posso ter mais de uma loja?", a: "Actualmente, cada conta de utilizador pode ter uma loja associada. Se precisar de mais, entre em contacto connosco." },
      { q: "Como gerir os meus produtos?", a: "Após a aprovação da loja, aceda ao Painel da Loja onde pode adicionar, editar e remover produtos, gerir slides e actualizar as configurações da loja." },
    ],
  },
  {
    label: "Segurança",
    icon: Shield,
    color: "text-red-500",
    bg: "bg-red-50",
    items: [
      { q: "As lojas sao verificadas?", a: "Sim. Todas as lojas passam por um processo de verificação antes de serem publicadas na plataforma. A nossa equipa analisa os dados fornecidos." },
      { q: "O que fazer se tiver um problema com um vendedor?", a: "Tente resolver directamente com o vendedor. Se não conseguir, entre em contacto connosco via email (info@superloja.vip) ou WhatsApp com os detalhes da situação." },
      { q: "Os meus dados estão seguros?", a: "Sim. Utilizamos encriptacao e medidas de segurança para proteger os seus dados. Consulte a nossa Política de Privacidade para mais detalhes." },
    ],
  },
  {
    label: "Conta",
    icon: UserCheck,
    color: "text-cyan-500",
    bg: "bg-cyan-50",
    items: [
      { q: "Como criar uma conta?", a: "Clique em 'Entrar' no menu superior e depois em 'Criar Conta'. Preencha o seu nome, email e senha. E rápido e gratuito." },
      { q: "Esqueci a minha senha, o que faco?", a: "Na página de login, clique em 'Esqueci a senha' e siga as instruções para redefinir a sua palavra-passe por email." },
      { q: "Como eliminar a minha conta?", a: "Entre em contacto connosco via email (info@superloja.vip) solicitando a eliminacao da sua conta. Os seus dados serão removidos conforme a nossa Política de Privacidade." },
    ],
  },
];

function FAQAccordion({ items }: { items: FAQItem[] }) {
  const [open, setOpen] = useState<number | null>(null);
  return (
    <div className="space-y-2">
      {items.map((item, i) => (
        <div key={i} className="rounded-xl border border-border overflow-hidden">
          <button onClick={() => setOpen(open === i ? null : i)}
            className="w-full flex items-center justify-between px-4 py-3 text-left hover:bg-secondary/50 transition-colors">
            <span className="text-sm font-medium pr-4">{item.q}</span>
            <ChevronDown className={`h-4 w-4 text-muted-foreground shrink-0 transition-transform duration-200 ${open === i ? "rotate-180" : ""}`} />
          </button>
          {open === i && (
            <div className="px-4 pb-4 pt-0">
              <p className="text-sm text-muted-foreground leading-relaxed">{item.a}</p>
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

export default function FAQ() {
  const [activeTab, setActiveTab] = useState(0);

  return (
    <main className="min-h-screen bg-secondary/30">
      <div className="bg-hero-gradient py-12 sm:py-16">
        <div className="container text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="h-11 w-11 rounded-xl bg-card/20 backdrop-blur flex items-center justify-center">
              <HelpCircle className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-primary-foreground">Perguntas Frequentes</h1>
          </div>
          <p className="text-primary-foreground/80 text-sm max-w-lg mx-auto">
            Encontre respostas rapidas para as dúvidas mais comuns sobre o SuperLoja.
          </p>
        </div>
      </div>

      <div className="container py-10 max-w-4xl">
        {/* Category tabs */}
        <div className="flex gap-2 flex-wrap mb-6">
          {categories.map((cat, i) => (
            <button key={i} onClick={() => setActiveTab(i)}
              className={`flex items-center gap-2 px-3 py-2 rounded-xl text-xs font-semibold transition-all ${
                activeTab === i
                  ? "bg-primary text-primary-foreground shadow-md"
                  : "bg-card border border-border text-muted-foreground hover:text-foreground hover:bg-secondary"
              }`}>
              <cat.icon className={`h-3.5 w-3.5 ${activeTab === i ? "text-primary-foreground" : cat.color}`} />
              {cat.label}
              <span className={`text-[10px] px-1.5 py-0.5 rounded-full ${activeTab === i ? "bg-white/20 text-primary-foreground" : "bg-secondary text-muted-foreground"}`}>
                {cat.items.length}
              </span>
            </button>
          ))}
        </div>

        {/* Active category */}
        <div className="rounded-2xl bg-card border border-border p-5 sm:p-6">
          <div className="flex items-center gap-3 mb-5">
            <div className={`h-10 w-10 rounded-xl ${categories[activeTab].bg} flex items-center justify-center`}>
              {(() => { const Icon = categories[activeTab].icon; return <Icon className={`h-5 w-5 ${categories[activeTab].color}`} />; })()}
            </div>
            <div>
              <h2 className="text-sm font-bold">{categories[activeTab].label}</h2>
              <p className="text-[11px] text-muted-foreground">{categories[activeTab].items.length} perguntas</p>
            </div>
          </div>
          <FAQAccordion items={categories[activeTab].items} />
        </div>

        {/* Still have questions */}
        <div className="mt-8 rounded-2xl bg-card border border-border p-6 text-center">
          <HelpCircle className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <h3 className="font-bold mb-1">Ainda tem dúvidas?</h3>
          <p className="text-sm text-muted-foreground mb-4">
            Não encontrou o que procurava? Entre em contacto connosco e teremos todo o gosto em ajudar.
          </p>
          <div className="flex gap-3 justify-center flex-wrap">
            <a href="https://wa.me/244923456789" target="_blank" rel="noopener noreferrer"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl bg-green-500 text-white text-sm font-semibold hover:bg-green-600 transition-colors">
              <MessageCircle className="h-4 w-4" /> WhatsApp
            </a>
            <a href="mailto:info@superloja.vip"
              className="inline-flex items-center gap-2 px-5 py-2.5 rounded-xl border border-border bg-card text-sm font-medium hover:bg-secondary transition-colors">
              Enviar Email
            </a>
          </div>
        </div>

        <div className="mt-6 text-center">
          <Link to="/" className="inline-flex items-center gap-2 text-sm text-muted-foreground hover:text-foreground transition-colors">
            <ArrowLeft className="h-4 w-4" /> Voltar ao início
          </Link>
        </div>
      </div>
    </main>
  );
}
