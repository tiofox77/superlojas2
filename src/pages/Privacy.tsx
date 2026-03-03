import { Link } from "react-router-dom";
import { ShieldCheck, ArrowLeft } from "lucide-react";

const sections = [
  {
    title: "1. Introducao",
    content: `A SuperLojas ("nos", "nosso" ou "Plataforma") esta comprometida com a proteccao da privacidade dos seus utilizadores. Esta Politica de Privacidade explica como recolhemos, utilizamos, armazenamos e protegemos as suas informacoes pessoais quando utiliza a nossa plataforma.

Ao utilizar a SuperLojas, o utilizador consente com a recolha e tratamento dos seus dados conforme descrito nesta politica.`,
  },
  {
    title: "2. Dados que Recolhemos",
    content: `Recolhemos os seguintes tipos de informacao:

Dados de Registo:
• Nome completo
• Endereco de email
• Numero de telefone/WhatsApp
• Palavra-passe (armazenada de forma encriptada)

Dados de Loja (para vendedores):
• Nome da loja e descricao
• Logotipo e imagens
• Provincia, municipio e endereco
• Categoria de produtos

Dados de Navegacao:
• Endereco IP
• Tipo de navegador e dispositivo
• Paginas visitadas e tempo de permanencia
• Cookies e tecnologias semelhantes`,
  },
  {
    title: "3. Como Utilizamos os Dados",
    content: `Utilizamos as informacoes recolhidas para:
• Criar e gerir a sua conta na Plataforma
• Exibir os seus produtos e informacoes da loja (vendedores)
• Facilitar a comunicacao entre compradores e vendedores
• Melhorar a experiencia de utilizacao da Plataforma
• Enviar notificacoes relevantes sobre a sua conta ou loja
• Garantir a seguranca da Plataforma e prevenir fraudes
• Cumprir obrigacoes legais e regulatórias`,
  },
  {
    title: "4. Partilha de Dados",
    content: `A SuperLojas NAO vende os seus dados pessoais a terceiros.

Podemos partilhar informacoes nas seguintes situacoes:
• Informacoes publicas da loja: nome, logo, localizacao, produtos e contacto WhatsApp sao publicamente visiveis na Plataforma
• Prestadores de servicos: podemos utilizar servicos de terceiros para alojamento, analise e envio de emails, que podem aceder a dados necessarios para o servico
• Obrigacoes legais: podemos divulgar informacoes quando exigido por lei ou por autoridades competentes`,
  },
  {
    title: "5. Armazenamento e Seguranca",
    content: `Implementamos medidas de seguranca tecnicas e organizacionais para proteger os seus dados, incluindo:
• Encriptacao de palavras-passe com algoritmos seguros
• Comunicacao encriptada via HTTPS
• Acesso restrito aos dados pessoais
• Backups regulares

Os dados sao armazenados em servidores seguros. Apesar dos nossos esforcos, nenhum sistema e 100% seguro e nao podemos garantir seguranca absoluta.`,
  },
  {
    title: "6. Cookies",
    content: `A Plataforma utiliza cookies e tecnologias semelhantes para:
• Manter a sua sessao activa (cookies de autenticacao)
• Lembrar as suas preferencias
• Analisar o uso da Plataforma (cookies de analise)

Pode desactivar os cookies nas configuracoes do seu navegador, mas isso pode afectar o funcionamento da Plataforma.`,
  },
  {
    title: "7. Direitos do Utilizador",
    content: `O utilizador tem os seguintes direitos em relacao aos seus dados:
• Acesso: solicitar uma copia dos seus dados pessoais
• Rectificacao: corrigir dados incorrectos ou incompletos
• Eliminacao: solicitar a eliminacao dos seus dados e conta
• Portabilidade: receber os seus dados num formato estruturado
• Oposicao: opor-se ao tratamento dos seus dados para fins especificos

Para exercer estes direitos, entre em contacto connosco atraves dos canais indicados abaixo.`,
  },
  {
    title: "8. Retencao de Dados",
    content: `Mantemos os seus dados pessoais enquanto a sua conta estiver activa ou conforme necessario para fornecer os nossos servicos. Apos o encerramento da conta, podemos manter determinados dados por um periodo razoavel para cumprir obrigacoes legais, resolver disputas e fazer cumprir os nossos termos.`,
  },
  {
    title: "9. Menores de Idade",
    content: `A Plataforma nao se destina a menores de 18 anos. Nao recolhemos intencionalmente dados de menores. Se tomarmos conhecimento de que recolhemos dados de um menor, tomaremos medidas para eliminar essa informacao.`,
  },
  {
    title: "10. Alteracoes a esta Politica",
    content: `Podemos actualizar esta Politica de Privacidade periodicamente. Quaisquer alteracoes serao publicadas nesta pagina com a data de actualizacao. Recomendamos a revisao periodica desta politica.`,
  },
  {
    title: "11. Contacto",
    content: `Para questoes sobre privacidade e proteccao de dados:
• Email: privacidade@superlojas.ao
• Email geral: info@superlojas.ao
• WhatsApp: +244 923 456 789
• Endereco: Luanda, Angola`,
  },
];

export default function Privacy() {
  return (
    <main className="min-h-screen bg-secondary/30">
      <div className="bg-hero-gradient py-12 sm:py-16">
        <div className="container text-center">
          <div className="flex items-center justify-center gap-2 mb-3">
            <div className="h-11 w-11 rounded-xl bg-card/20 backdrop-blur flex items-center justify-center">
              <ShieldCheck className="h-5 w-5 text-primary-foreground" />
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold text-primary-foreground">Politica de Privacidade</h1>
          </div>
          <p className="text-primary-foreground/80 text-sm max-w-lg mx-auto">
            Saiba como recolhemos, utilizamos e protegemos os seus dados pessoais.
          </p>
          <p className="text-primary-foreground/60 text-xs mt-2">Ultima actualizacao: Marco 2026</p>
        </div>
      </div>

      <div className="container py-10 max-w-3xl">
        {/* TOC */}
        <div className="rounded-2xl bg-card border border-border p-5 mb-6">
          <h3 className="text-xs font-bold uppercase tracking-wider text-muted-foreground mb-3">Indice</h3>
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-1.5">
            {sections.map((s, i) => (
              <a key={i} href={`#priv-${i}`} className="text-xs text-muted-foreground hover:text-foreground transition-colors py-0.5">
                {s.title}
              </a>
            ))}
          </div>
        </div>

        <div className="rounded-2xl bg-card border border-border overflow-hidden">
          {sections.map((section, i) => (
            <div key={i} id={`priv-${i}`} className={`p-6 ${i < sections.length - 1 ? "border-b border-border" : ""}`}>
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
