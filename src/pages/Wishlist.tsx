import { useWishlist } from "@/contexts/WishlistContext";
import { ProductCard } from "@/components/ProductCard";
import { Link } from "react-router-dom";
import { Heart } from "lucide-react";
import { Button } from "@/components/ui/button";
import { motion } from "framer-motion";

const Wishlist = () => {
  const { items } = useWishlist();

  if (items.length === 0) {
    return (
      <main className="container py-16 text-center min-h-screen">
        <Heart className="h-12 w-12 text-muted-foreground/30 mx-auto mb-4" />
        <h1 className="text-2xl font-bold mb-2">Lista de Desejos Vazia</h1>
        <p className="text-muted-foreground mb-6">Adicione produtos que gosta à sua lista de desejos.</p>
        <Link to="/"><Button>Explorar Produtos</Button></Link>
      </main>
    );
  }

  return (
    <main className="min-h-screen bg-secondary/30">
      <div className="container py-8">
        <div className="flex items-center gap-2 mb-6">
          <Heart className="h-5 w-5 text-destructive" />
          <h1 className="text-2xl font-bold">Lista de Desejos</h1>
          <span className="text-sm text-muted-foreground">({items.length} {items.length === 1 ? "item" : "itens"})</span>
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3">
          {items.map((product, i) => (
            <motion.div
              key={product.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3, delay: i * 0.04 }}
            >
              <ProductCard product={product} />
            </motion.div>
          ))}
        </div>
      </div>
    </main>
  );
};

export default Wishlist;
