import { Link } from "react-router-dom";
import { ShoppingCart, Search, Store, CreditCard, Truck, CheckCircle2, MessageCircle, Shield, ArrowRight, HelpCircle } from "lucide-react";

const steps = [
  {
    num: 1,
    icon: Search,
    color: "from-blue-500 to-cyan-500",
    title: "Pesquise o Produto",
    desc: "Use a barra de pesquisa ou navegue pelas categorias para encontrar o que procura. Pode filtrar por preco, categoria, avaliacao e localizacao.",
    tips: ["Use palavras-chave especificas", "Filtre por provincia para encontrar lojas perto de si", "Veja as avaliacoes de outros clientes"],
  },
  {
    num: 2,
    icon: Store,
    color: "from-emerald-500 to-teal-500",
    title: "Escolha a Loja",
    desc: "Cada produto pertence a uma loja verificada. Visite a pagina da loja para ver todos os produtos, avaliacoes e informacoes de contacto.",
    tips: ["Verifique a avaliacao da loja", "Veja ha quanto tempo a loja esta activa", "Confira se a loja esta na sua provincia"],
  },
  {
    num: 3,
    icon: ShoppingCart,
    color: "from-orange-500 to-pink-500",
    title: "Adicione ao Carrinho",
    desc: "Clique em 'Adicionar ao Carrinho' no produto desejado. Pode adicionar produtos de varias lojas ao mesmo tempo.",
    tips: ["Verifique o stock disponivel", "Compare precos entre lojas diferentes", "Aproveite produtos em promocao"],
  },
  {
    num: 4,
    icon: MessageCircle,
    color: "from-green-500 to-emerald-500",
    title: "Contacte o Vendedor",
    desc: "Clique no botao de WhatsApp para falar directamente com o vendedor. Combine os detalhes da entrega, forma de pagamento e tire todas as suas duvidas.",
    tips: ["Confirme a disponibilidade do produto", "Combine o local e hora de entrega", "Pergunte sobre garantias"],
  },
  {
    num: 5,
    icon: CreditCard,
    color: "from-violet-500 to-purple-500",
    title: "Pagamento",
    desc: "O pagamento e combinado directamente com o vendedor. As formas mais comuns em Angola sao: transferencia bancaria (Multicaixa Express), pagamento na entrega ou deposito.",
    tips: ["Multicaixa Express e o mais rapido", "Pagamento na entrega e o mais seguro", "Guarde sempre o comprovativo"],
  },
  {
    num: 6,
    icon: Truck,
    color: "from-amber-500 to-orange-500",
    title: "Receba o Produto",
    desc: "A entrega e combinada directamente com o vendedor. Pode ser entrega ao domicilio, recolha na loja ou envio por transportadora.",
    tips: ["Confirme o endereco de entrega", "Verifique o produto ao receber", "Avalie a loja depois da compra"],
  },
];

export default function HowToBuy() {
  return (
    <main className="min-h-screen bg-secondary/30">
      {/* Hero */}
      <div className="bg-hero-gradient py-12 sm:py-16">
        <div className="container text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="h-11 w-11 rounded-xl bg-card/20 backdrop-blur flex items-center justify-center">
              <ShoppingCart className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-primary-foreground">Como Comprar</h1>
          </div>
          <p className="text-primary-foreground/80 text-sm max-w-lg mx-auto">
            Comprar no SuperLojas e simples, seguro e rapido. Siga os passos abaixo para fazer a sua primeira compra.
          </p>
        </div>
      </div>

      <div className="container py-10 max-w-4xl">
        {/* Steps */}
        <div className="space-y-6">
          {steps.map((s, i) => (
            <div key={s.num} className="flex gap-4 sm:gap-6">
              {/* Left: number line */}
              <div className="flex flex-col items-center">
                <div className={`h-12 w-12 rounded-2xl bg-gradient-to-br ${s.color} flex items-center justify-center text-white font-bold text-lg shadow-lg shrink-0`}>
                  {s.num}
                </div>
                {i < steps.length - 1 && <div className="w-0.5 flex-1 bg-border mt-2" />}
              </div>
              {/* Right: content */}
              <div className="pb-8 flex-1">
                <div className="flex items-center gap-2 mb-1">
                  <s.icon className="h-5 w-5 text-muted-foreground" />
                  <h3 className="text-base font-bold">{s.title}</h3>
                </div>
                <p className="text-sm text-muted-foreground leading-relaxed mb-3">{s.desc}</p>
                <div className="rounded-xl bg-card border border-border p-3">
                  <p className="text-[10px] font-bold text-muted-foreground uppercase tracking-wider mb-2">Dicas</p>
                  <ul className="space-y-1.5">
                    {s.tips.map((tip, j) => (
                      <li key={j} className="flex items-start gap-2 text-xs text-muted-foreground">
                        <CheckCircle2 className="h-3.5 w-3.5 text-emerald-500 shrink-0 mt-0.5" />
                        <span>{tip}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            </div>
          ))}
        </div>

        {/* Security note */}
        <div className="mt-8 rounded-2xl bg-card border border-border p-6">
          <div className="flex items-start gap-4">
            <div className="h-12 w-12 rounded-xl bg-blue-50 flex items-center justify-center shrink-0">
              <Shield className="h-6 w-6 text-blue-500" />
            </div>
            <div>
              <h3 className="font-bold mb-1">Compra Segura</h3>
              <p className="text-sm text-muted-foreground leading-relaxed">
                Todas as lojas no SuperLojas sao verificadas pela nossa equipa antes de serem aprovadas. 
                No entanto, recomendamos sempre que confirme os detalhes do produto directamente com o vendedor 
                via WhatsApp antes de efectuar o pagamento. Em caso de problema, contacte o nosso suporte.
              </p>
            </div>
          </div>
        </div>

        {/* CTA */}
        <div className="mt-8 text-center space-y-3">
          <p className="text-sm text-muted-foreground">Pronto para comecar?</p>
          <div className="flex gap-3 justify-center flex-wrap">
            <Link to="/lojas" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl bg-hero-gradient text-primary-foreground font-semibold text-sm hover:opacity-90 transition-opacity">
              <Store className="h-4 w-4" /> Explorar Lojas <ArrowRight className="h-4 w-4" />
            </Link>
            <Link to="/faq" className="inline-flex items-center gap-2 px-6 py-3 rounded-xl border border-border bg-card text-sm font-medium hover:bg-secondary transition-colors">
              <HelpCircle className="h-4 w-4" /> Ver Perguntas Frequentes
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
