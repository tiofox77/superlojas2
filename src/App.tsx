import { Toaster } from "@/components/ui/toaster";
import { Toaster as Sonner } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Routes, Route, useLocation } from "react-router-dom";
import { useEffect } from "react";
import { AuthProvider } from "@/contexts/AuthContext";
import { CartProvider } from "@/contexts/CartContext";
import { WishlistProvider } from "@/contexts/WishlistContext";
import { ToastProvider } from "@/contexts/ToastContext";
import { Header } from "@/components/Header";
import { Footer } from "@/components/Footer";
import { CartDrawer } from "@/components/CartDrawer";
import Index from "./pages/Index";
import Stores from "./pages/Stores";
import StoreDetail from "./pages/StoreDetail";
import ProductDetail from "./pages/ProductDetail";
import Cart from "./pages/Cart";
import Checkout from "./pages/Checkout";
import Auth from "./pages/Auth";
import FlashSale from "./pages/FlashSale";
import Categories from "./pages/Categories";
import CategoryDetail from "./pages/CategoryDetail";
import Wishlist from "./pages/Wishlist";
import RegisterStore from "./pages/RegisterStore";
import HowToBuy from "./pages/HowToBuy";
import Terms from "./pages/Terms";
import Privacy from "./pages/Privacy";
import FAQ from "./pages/FAQ";
import Contact from "./pages/Contact";
import MyStore from "./pages/MyStore";
import NotFound from "./pages/NotFound";
import DynamicHead from "./components/DynamicHead";
import { PageTracker } from "./components/PageTracker";
import AdminLayout from "./layouts/AdminLayout";
import AdminDashboard from "./pages/admin/Dashboard";
import AdminStores from "./pages/admin/Stores";
import AdminProducts from "./pages/admin/Products";
import AdminCategories from "./pages/admin/Categories";
import AdminUsers from "./pages/admin/Users";
import AdminHeroSlides from "./pages/admin/HeroSlides";
import AdminNotifications from "./pages/admin/Notifications";
import AdminSettings from "./pages/admin/Settings";
import AdminPlans from "./pages/admin/Plans";
import AdminSubscriptions from "./pages/admin/Subscriptions";
import AdminPaymentMethods from "./pages/admin/PaymentMethods";
import AdminEmailLogs from "./pages/admin/EmailLogs";
import AdminAnalytics from "./pages/admin/Analytics";
import AdminAnalyticsReports from "./pages/admin/AnalyticsReports";
import AdminSystemUpdate from "./pages/admin/SystemUpdate";
import StorePanelLayout from "./layouts/StorePanelLayout";
import StorePanelDashboard from "./pages/store-panel/Dashboard";
import StorePanelProducts from "./pages/store-panel/Products";
import StorePanelSlides from "./pages/store-panel/Slides";
import StorePanelPayments from "./pages/store-panel/Payments";
import StorePanelSettings from "./pages/store-panel/Settings";
import StorePanelApiSettings from "./pages/store-panel/ApiSettings";
import StorePanelSubscription from "./pages/store-panel/Subscription";
import StorePanelOrders from "./pages/store-panel/Orders";
import StorePanelPos from "./pages/store-panel/Pos";
import StorePanelAnalytics from "./pages/store-panel/Analytics";
import StorePanelCategories from "./pages/store-panel/Categories";
import ClientPanelLayout from "./layouts/ClientPanelLayout";
import ClientDashboard from "./pages/client/Dashboard";
import ClientOrders from "./pages/client/Orders";
import ClientProfile from "./pages/client/Profile";
import ClientAddresses from "./pages/client/Addresses";
import ClientSecurity from "./pages/client/Security";
import ClientFollowing from "./pages/client/Following";
import ClientFeed from "./pages/client/Feed";
import PwaInstallPrompt from "./components/PwaInstallPrompt";
import { SubdomainStoreProvider } from "./contexts/SubdomainStoreContext";
import SubdomainStoreLayout from "./layouts/SubdomainStoreLayout";
import { isSubdomainMode } from "./hooks/useSubdomain";

function ScrollToTop() {
  const { pathname } = useLocation();
  useEffect(() => { window.scrollTo(0, 0); }, [pathname]);
  return null;
}

const queryClient = new QueryClient();

const StoreFrontLayout = () => (
  <>
    <Header />
    <CartDrawer />
    <Routes>
      <Route path="/" element={<Index />} />
      <Route path="/lojas" element={<Stores />} />
      <Route path="/lojas/:slug" element={<StoreDetail />} />
      <Route path="/produto/:slug" element={<ProductDetail />} />
      <Route path="/carrinho" element={<Cart />} />
      <Route path="/checkout" element={<Checkout />} />
      <Route path="/entrar" element={<Auth />} />
      <Route path="/ofertas" element={<FlashSale />} />
      <Route path="/categorias" element={<Categories />} />
      <Route path="/categoria/:slug" element={<CategoryDetail />} />
      <Route path="/favoritos" element={<Wishlist />} />
      <Route path="/cadastro-loja" element={<RegisterStore />} />
      <Route path="/como-comprar" element={<HowToBuy />} />
      <Route path="/termos" element={<Terms />} />
      <Route path="/privacidade" element={<Privacy />} />
      <Route path="/faq" element={<FAQ />} />
      <Route path="/contacto" element={<Contact />} />
      <Route path="/minha-loja" element={<MyStore />} />
      <Route path="*" element={<NotFound />} />
    </Routes>
    <Footer />
  </>
);

const subdomain = isSubdomainMode();

const App = () => (
  <QueryClientProvider client={queryClient}>
    <TooltipProvider>
      <AuthProvider>
      <ToastProvider>
      <WishlistProvider>
        <CartProvider>
          <Toaster />
          <Sonner />
          <BrowserRouter>
            <DynamicHead />
            <ScrollToTop />
            <PageTracker />
            <PwaInstallPrompt />
            {subdomain ? (
              /* ─── Subdomain mode: loja individual ─── */
              <SubdomainStoreProvider>
                <Routes>
                  <Route path="/*" element={<SubdomainStoreLayout />} />
                </Routes>
              </SubdomainStoreProvider>
            ) : (
              /* ─── Main domain: marketplace completo ─── */
              <Routes>
                {/* Admin panel — layout separado, sem Header/Footer da loja */}
                <Route path="/admin" element={<AdminLayout />}>
                  <Route index element={<AdminDashboard />} />
                  <Route path="lojas" element={<AdminStores />} />
                  <Route path="produtos" element={<AdminProducts />} />
                  <Route path="categorias" element={<AdminCategories />} />
                  <Route path="utilizadores" element={<AdminUsers />} />
                  <Route path="slides" element={<AdminHeroSlides />} />
                  <Route path="planos" element={<AdminPlans />} />
                  <Route path="subscricoes" element={<AdminSubscriptions />} />
                  <Route path="metodos-pagamento" element={<AdminPaymentMethods />} />
                  <Route path="notificacoes" element={<AdminNotifications />} />
                  <Route path="configuracoes" element={<AdminSettings />} />
                  <Route path="emails" element={<AdminEmailLogs />} />
                  <Route path="analytics" element={<AdminAnalytics />} />
                  <Route path="relatorios" element={<AdminAnalyticsReports />} />
                  <Route path="actualizacoes" element={<AdminSystemUpdate />} />
                </Route>
                {/* Store Owner Panel */}
                <Route path="/loja/:slug/painel" element={<StorePanelLayout />}>
                  <Route index element={<StorePanelDashboard />} />
                  <Route path="produtos" element={<StorePanelProducts />} />
                  <Route path="categorias" element={<StorePanelCategories />} />
                  <Route path="pedidos" element={<StorePanelOrders />} />
                  <Route path="slides" element={<StorePanelSlides />} />
                  <Route path="pagamentos" element={<StorePanelPayments />} />
                  <Route path="configuracoes" element={<StorePanelSettings />} />
                  <Route path="api" element={<StorePanelApiSettings />} />
                  <Route path="subscricao" element={<StorePanelSubscription />} />
                  <Route path="pos" element={<StorePanelPos />} />
                  <Route path="analytics" element={<StorePanelAnalytics />} />
                </Route>
                {/* Client Panel */}
                <Route path="/minha-conta" element={<ClientPanelLayout />}>
                  <Route index element={<ClientDashboard />} />
                  <Route path="pedidos" element={<ClientOrders />} />
                  <Route path="perfil" element={<ClientProfile />} />
                  <Route path="enderecos" element={<ClientAddresses />} />
                  <Route path="seguranca" element={<ClientSecurity />} />
                  <Route path="seguindo" element={<ClientFollowing />} />
                  <Route path="feed" element={<ClientFeed />} />
                </Route>
                {/* Storefront — layout normal com Header/Footer */}
                <Route path="/*" element={<StoreFrontLayout />} />
              </Routes>
            )}
          </BrowserRouter>
        </CartProvider>
      </WishlistProvider>
      </ToastProvider>
      </AuthProvider>
    </TooltipProvider>
  </QueryClientProvider>
);

export default App;
