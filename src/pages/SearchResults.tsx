import { useMemo } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { ArrowLeft, Search } from "lucide-react";
import { useProducts } from "@/hooks/useApi";
import { ProductCard } from "@/components/ProductCard";

// /pesquisa page, reconstructed 2026-10-13 from the production bundle
// (index-DPsHM3DV.js, function `RR`). Its source was never uploaded or committed.
// Markup and behaviour match the live page exactly.
export default function SearchResults() {
  const [searchParams, setSearchParams] = useSearchParams();
  const query = (searchParams.get("q") || "").trim();
  const { data: products = [], isLoading } = useProducts(query ? { search: query } : undefined);

  const results = useMemo(() => {
    const q = query.toLocaleLowerCase("pt");
    return products.filter(
      (p) =>
        !q ||
        p.name.toLocaleLowerCase("pt").includes(q) ||
        p.category.toLocaleLowerCase("pt").includes(q) ||
        p.store.name.toLocaleLowerCase("pt").includes(q)
    );
  }, [products, query]);

  return (
    <main className="min-h-screen bg-secondary/30">
      <section className="bg-hero-gradient py-8 sm:py-12 text-primary-foreground">
        <div className="container">
          <Link to="/" className="inline-flex items-center gap-1 text-xs text-primary-foreground/80 hover:text-white mb-3">
            <ArrowLeft className="h-3.5 w-3.5" /> Voltar ao início
          </Link>
          <h1 className="text-2xl sm:text-3xl font-extrabold">Resultados da pesquisa</h1>
          <form
            className="relative max-w-2xl mt-5"
            onSubmit={(e) => {
              e.preventDefault();
              const q = new FormData(e.currentTarget).get("q")?.toString().trim();
              if (q) setSearchParams({ q });
            }}
          >
            <Search className="absolute left-4 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <input
              name="q"
              defaultValue={query}
              aria-label="Pesquisar produtos"
              className="w-full rounded-2xl bg-card text-foreground pl-11 pr-24 py-3 text-sm"
              placeholder="Produto, categoria ou loja..."
            />
            <button className="absolute right-2 top-1/2 -translate-y-1/2 bg-primary text-primary-foreground rounded-xl px-4 py-2 text-xs font-semibold">
              Buscar
            </button>
          </form>
        </div>
      </section>

      <section className="container py-7">
        <p className="text-sm text-muted-foreground mb-5">
          {isLoading ? "A pesquisar..." : `${results.length} resultado${results.length === 1 ? "" : "s"} para “${query}”`}
        </p>
        {results.length > 0 ? (
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
            {results.map((p) => (
              <ProductCard key={p.id} product={p} />
            ))}
          </div>
        ) : (
          !isLoading && (
            <div className="rounded-2xl border border-border bg-card text-center py-14">
              <Search className="h-10 w-10 mx-auto text-muted-foreground/40 mb-3" />
              <p className="font-semibold">Nenhum produto encontrado</p>
              <p className="text-sm text-muted-foreground mt-1">Tente outro nome, categoria ou loja.</p>
            </div>
          )
        )}
      </section>
    </main>
  );
}

