import { useState, useEffect } from "react";
import { useCart } from "@/contexts/CartContext";
import { useAuth } from "@/contexts/AuthContext";
import { Link, useNavigate } from "react-router-dom";
import { ArrowLeft, CreditCard, MapPin, Phone, User, Mail, CheckCircle2, Truck, ShieldCheck, Loader2, AlertTriangle, BookmarkCheck, PenLine, Upload, Building2, Copy, FileText } from "lucide-react";
import { toast } from "sonner";
import { Button } from "@/components/ui/button";
import { logoSrc, onImgError } from "@/lib/imageHelpers";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

interface ProvinceData { name: string; municipalities: string[]; }
interface SavedAddress {
  label: string; name: string; phone: string;
  address: string; province: string; city: string;
  is_default: boolean;
}

const TRANSFER_TYPES = ["transfer", "transferencia", "deposit", "deposito"];
const isTransferType = (type: string) => TRANSFER_TYPES.some(t => type.toLowerCase().includes(t));

const Checkout = () => {
  const { items, totalPrice, clearCart } = useCart();
  const { user, token } = useAuth();
  const navigate = useNavigate();
  const formatPrice = (val: number) => new Intl.NumberFormat("pt-AO").format(val);
  const [step, setStep] = useState<"info" | "confirm" | "done">("info");
  const [processing, setProcessing] = useState(false);
  const [stockErrors, setStockErrors] = useState<string[]>([]);
  const [provinces, setProvinces] = useState<ProvinceData[]>([]);
  const [savedAddresses, setSavedAddresses] = useState<SavedAddress[]>([]);
  const [selectedAddrIdx, setSelectedAddrIdx] = useState<number | null>(null);
  const [useManualAddr, setUseManualAddr] = useState(false);

  const [orderNumbers, setOrderNumbers] = useState<string[]>([]);
  const [form, setForm] = useState({
    name: user?.name || "", email: user?.email || "", phone: user?.phone || "", address: "", city: "", province: "", notes: "",
  });

  // Per-store payment method selection: { [storeId]: method_type }
  const [storePayments, setStorePayments] = useState<Record<string, string>>({});
  // Per-store receipt files for transfer payments
  const [storeReceipts, setStoreReceipts] = useState<Record<string, File>>({});
  const [receiptPreviews, setReceiptPreviews] = useState<Record<string, string>>({});
  // Fresh payment methods fetched from API (not from stale cart)
  const [freshPaymentMethods, setFreshPaymentMethods] = useState<Record<string, { type: string; label: string; details: string; account: string; is_active: boolean }[]>>({});

  useEffect(() => {
    fetch(`${API}/provinces`).then(r => r.json()).then(d => setProvinces(d)).catch(() => {});
  }, []);

  // Update form with user data when auth loads
  useEffect(() => {
    if (user) {
      setForm(prev => ({
        ...prev,
        name: prev.name || user.name || "",
        email: prev.email || user.email || "",
        phone: prev.phone || user.phone || "",
      }));
    }
  }, [user]);

  // Fetch saved addresses for logged-in user
  useEffect(() => {
    if (!token) return;
    fetch(`${API}/client/addresses`, { headers: { Authorization: `Bearer ${token}`, Accept: "application/json" } })
      .then(r => r.json())
      .then(d => {
        const addrs = Array.isArray(d) ? d : [];
        setSavedAddresses(addrs);
        // Auto-select default address
        const defIdx = addrs.findIndex((a: SavedAddress) => a.is_default);
        if (defIdx >= 0) {
          setSelectedAddrIdx(defIdx);
          applyAddress(addrs[defIdx]);
        } else if (addrs.length > 0) {
          setSelectedAddrIdx(0);
          applyAddress(addrs[0]);
        }
      })
      .catch(() => {});
  }, [token]);

  const applyAddress = (addr: SavedAddress) => {
    setForm(prev => ({
      ...prev,
      name: addr.name,
      phone: addr.phone,
      address: addr.address,
      province: addr.province,
      city: addr.city,
    }));
  };

  const selectSavedAddr = (idx: number) => {
    setSelectedAddrIdx(idx);
    setUseManualAddr(false);
    applyAddress(savedAddresses[idx]);
  };

  const switchToManual = () => {
    setSelectedAddrIdx(null);
    setUseManualAddr(true);
    setForm(prev => ({ ...prev, name: user?.name || "", phone: user?.phone || "", address: "", province: "", city: "" }));
  };

  const currentMunicipalities = provinces.find(p => p.name === form.province)?.municipalities || [];

  const byStore = items.reduce((acc, item) => {
    const sid = item.product.store.id;
    if (!acc[sid]) acc[sid] = { store: item.product.store, items: [] };
    acc[sid].items.push(item);
    return acc;
  }, {} as Record<string, { store: typeof items[0]["product"]["store"]; items: typeof items }>);

  const deliveryFee = Object.keys(byStore).length * 2500;

  // Fetch fresh payment methods from API for all stores in cart
  useEffect(() => {
    const storeIds = Object.keys(byStore);
    if (storeIds.length === 0) return;
    fetch(`${API}/stores/payment-methods`, {
      method: "POST",
      headers: { "Content-Type": "application/json", Accept: "application/json" },
      body: JSON.stringify({ store_ids: storeIds.map(Number) }),
    })
      .then(r => r.json())
      .then((data: Record<string, { type: string; label: string; details: string; account: string; is_active: boolean }[]>) => {
        setFreshPaymentMethods(data);
        // Auto-select first method for stores that don't have a selection yet
        const defaults: Record<string, string> = {};
        Object.entries(data).forEach(([apiSid, methods]) => {
          const sid = String(apiSid);
          const active = methods.filter(m => m.is_active);
          if (!storePayments[sid] && active.length > 0) {
            defaults[sid] = active[0].type;
          }
        });
        if (Object.keys(defaults).length > 0) {
          setStorePayments(prev => ({ ...defaults, ...prev }));
        }
      })
      .catch(() => {});
  }, [items.length]);

  const getStoreMethods = (store: typeof items[0]["product"]["store"]) => {
    const fresh = freshPaymentMethods[store.id];
    if (fresh && fresh.length > 0) return fresh.filter(m => m.is_active);
    return (store.paymentMethods || []).filter(m => m.is_active);
  };

  // Validation
  const allStoresHavePayment = Object.keys(byStore).every(sid => !!storePayments[sid]);
  const canContinue = !!form.name && !!form.email && !!form.phone && !!form.address && !!form.province && !!form.city && allStoresHavePayment;

  if (items.length === 0 && step !== "done") {
    return (
      <main className="container py-16 text-center min-h-screen">
        <h1 className="text-2xl font-bold mb-4">Carrinho Vazio</h1>
        <p className="text-muted-foreground mb-6">Adicione produtos para continuar.</p>
        <Link to="/"><Button>Explorar Produtos</Button></Link>
      </main>
    );
  }

  if (step === "done") {
    return (
      <main className="min-h-screen bg-secondary/30 flex items-center justify-center">
        <div className="text-center max-w-md p-8">
          <CheckCircle2 className="h-16 w-16 text-success mx-auto mb-4" />
          <h1 className="text-2xl font-bold mb-2">Pedido Confirmado!</h1>
          <p className="text-muted-foreground mb-2">O seu pedido foi registado com sucesso.</p>
          {orderNumbers.length > 0 && (
            <div className="my-4 space-y-1">
              {orderNumbers.map((n) => (
                <p key={n} className="text-sm font-mono font-semibold bg-accent rounded-lg px-3 py-2">Pedido #{n}</p>
              ))}
            </div>
          )}
          <p className="text-sm text-muted-foreground mb-6">Recebera um email com os detalhes. A loja entrara em contacto para confirmar a entrega.</p>
          <Link to="/"><Button>Voltar ao Inicio</Button></Link>
        </div>
      </main>
    );
  }

  const handleUpdate = (key: string, value: string) => setForm((p) => ({ ...p, [key]: value }));

  const inputCls = "w-full rounded-xl border border-border bg-secondary/50 px-4 py-2.5 text-sm focus:outline-none focus:ring-2 focus:ring-ring";

  return (
    <main className="min-h-screen bg-secondary/30">
      <div className="container py-8 max-w-4xl">
        <Link to="/carrinho" className="flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground mb-6">
          <ArrowLeft className="h-4 w-4" /> Voltar ao carrinho
        </Link>

        {/* Steps */}
        <div className="flex items-center gap-2 mb-8 text-sm">
          {["Dados de Entrega", "Confirmação"].map((label, i) => (
            <div key={label} className="flex items-center gap-2">
              {i > 0 && <div className="w-8 h-px bg-border" />}
              <div className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-medium ${
                (i === 0 && step === "info") || (i === 1 && step === "confirm")
                  ? "bg-primary text-primary-foreground" : "bg-card border border-border text-muted-foreground"
              }`}>
                <span>{i + 1}</span> {label}
              </div>
            </div>
          ))}
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Form */}
          <div className="lg:col-span-2 space-y-4">
            {step === "info" && (
              <>
                {/* Saved Addresses */}
                {savedAddresses.length > 0 && !useManualAddr && (
                  <div className="rounded-2xl border border-border bg-card p-6">
                    <h2 className="font-bold text-lg mb-3 flex items-center gap-2"><BookmarkCheck className="h-5 w-5 text-primary" /> Enderecos Guardados</h2>
                    <div className="space-y-2">
                      {savedAddresses.map((addr, i) => (
                        <button key={i} onClick={() => selectSavedAddr(i)}
                          className={`w-full text-left p-3 rounded-xl border transition-colors ${
                            selectedAddrIdx === i
                              ? "border-primary bg-accent"
                              : "border-border hover:border-primary/30"
                          }`}>
                          <div className="flex items-center justify-between">
                            <div>
                              <span className="text-sm font-semibold">{addr.label}</span>
                              {addr.is_default && <span className="ml-2 text-[10px] font-bold text-primary bg-primary/10 px-1.5 py-0.5 rounded-full">Padrao</span>}
                            </div>
                            {selectedAddrIdx === i && <CheckCircle2 className="h-4 w-4 text-primary" />}
                          </div>
                          <p className="text-xs text-muted-foreground mt-1">{addr.name} • {addr.phone}</p>
                          <p className="text-xs text-muted-foreground">{addr.address}, {addr.city}, {addr.province}</p>
                        </button>
                      ))}
                    </div>
                    <button onClick={switchToManual} className="mt-3 flex items-center gap-1.5 text-xs text-primary hover:underline">
                      <PenLine className="h-3.5 w-3.5" /> Usar outro endereco
                    </button>
                  </div>
                )}

                {/* Manual Address Form */}
                <div className="rounded-2xl border border-border bg-card p-6">
                  {savedAddresses.length > 0 && useManualAddr && (
                    <button onClick={() => { setUseManualAddr(false); if (savedAddresses.length > 0) selectSavedAddr(selectedAddrIdx ?? 0); }}
                      className="mb-3 flex items-center gap-1.5 text-xs text-primary hover:underline">
                      <BookmarkCheck className="h-3.5 w-3.5" /> Usar endereco guardado
                    </button>
                  )}
                  <h2 className="font-bold text-lg mb-4 flex items-center gap-2"><MapPin className="h-5 w-5 text-primary" /> Dados de Entrega</h2>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Nome Completo *</label>
                      <div className="relative">
                        <User className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input type="text" value={form.name} onChange={(e) => handleUpdate("name", e.target.value)}
                          placeholder="Seu nome" className={`${inputCls} pl-10`} />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Email *</label>
                      <div className="relative">
                        <Mail className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input type="email" value={form.email} onChange={(e) => handleUpdate("email", e.target.value)}
                          placeholder="email@exemplo.com" className={`${inputCls} pl-10`} />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Telefone *</label>
                      <div className="relative">
                        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
                        <input type="tel" value={form.phone} onChange={(e) => handleUpdate("phone", e.target.value)}
                          placeholder="+244 9XX XXX XXX" className={`${inputCls} pl-10`} />
                      </div>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Provincia *</label>
                      <select value={form.province} onChange={(e) => { handleUpdate("province", e.target.value); handleUpdate("city", ""); }} className={inputCls}>
                        <option value="">Seleccionar provincia...</option>
                        {provinces.map((p) => (
                          <option key={p.name} value={p.name}>{p.name}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label className="text-sm font-medium mb-1.5 block">Municipio *</label>
                      <select value={form.city} onChange={(e) => handleUpdate("city", e.target.value)} className={inputCls} disabled={!form.province}>
                        <option value="">{form.province ? "Seleccionar municipio..." : "Seleccione provincia primeiro"}</option>
                        {currentMunicipalities.map((m) => (
                          <option key={m} value={m}>{m}</option>
                        ))}
                      </select>
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-sm font-medium mb-1.5 block">Endereco Completo *</label>
                      <input type="text" value={form.address} onChange={(e) => handleUpdate("address", e.target.value)}
                        placeholder="Rua, numero, bairro..." className={inputCls} />
                    </div>
                    <div className="sm:col-span-2">
                      <label className="text-sm font-medium mb-1.5 block">Notas (opcional)</label>
                      <textarea value={form.notes} onChange={(e) => handleUpdate("notes", e.target.value)}
                        placeholder="Instrucoes de entrega..." rows={2}
                        className={`${inputCls} resize-none`} />
                    </div>
                  </div>
                </div>

                {/* Payment per Store */}
                <div className="rounded-2xl border border-border bg-card p-6">
                  <h3 className="font-bold text-lg mb-4 flex items-center gap-2"><CreditCard className="h-5 w-5 text-primary" /> Forma de Pagamento</h3>
                  <div className="space-y-5">
                    {Object.entries(byStore).map(([sid, { store, items: storeItems }]) => {
                      const methods = getStoreMethods(store);
                      const storeSubtotal = storeItems.reduce((a, i) => a + i.product.price * i.quantity, 0);
                      return (
                        <div key={sid} className="space-y-3">
                          <div className="flex items-center gap-2">
                            <img src={logoSrc(store.logo, store.name)} alt="" className="h-6 w-6 rounded-lg" onError={onImgError("logo", store.name)} />
                            <span className="text-sm font-semibold">{store.name}</span>
                            <span className="ml-auto text-xs font-medium text-muted-foreground">{formatPrice(storeSubtotal + 2500)} Kz</span>
                          </div>
                          <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                            {methods.map((m) => (
                              <button key={m.type} onClick={() => setStorePayments(prev => ({ ...prev, [sid]: m.type }))}
                                className={`p-2.5 rounded-xl border text-xs font-medium transition-colors ${
                                  storePayments[sid] === m.type
                                    ? "border-primary bg-accent text-accent-foreground"
                                    : "border-border bg-card hover:border-primary/30"
                                }`}>
                                {m.label}
                              </button>
                            ))}
                          </div>

                          {/* Bank details + receipt upload for transfer-type payments */}
                          {(() => {
                            const chosenMethod = methods.find(m => m.type === storePayments[sid]);
                            if (!chosenMethod || !isTransferType(chosenMethod.type)) return null;
                            const hasDetails = chosenMethod.account || chosenMethod.details;
                            return (
                              <div className="rounded-xl border border-blue-200 bg-blue-50/50 p-4 space-y-3">
                                {hasDetails && (
                                  <div>
                                    <p className="text-xs font-semibold text-blue-700 flex items-center gap-1.5 mb-2">
                                      <Building2 className="h-3.5 w-3.5" /> Coordenadas Bancarias
                                    </p>
                                    {chosenMethod.account && (
                                      <div className="flex items-center gap-2 bg-white rounded-lg px-3 py-2 border border-blue-100">
                                        <div className="flex-1 min-w-0">
                                          <p className="text-[10px] text-blue-500 uppercase tracking-wider">IBAN / Conta</p>
                                          <p className="text-sm font-mono font-semibold text-blue-900 truncate">{chosenMethod.account}</p>
                                        </div>
                                        <button type="button" onClick={() => { navigator.clipboard.writeText(chosenMethod.account); toast.success("Copiado!"); }}
                                          className="p-1.5 rounded-lg hover:bg-blue-50 text-blue-500 transition-colors shrink-0">
                                          <Copy className="h-3.5 w-3.5" />
                                        </button>
                                      </div>
                                    )}
                                    {chosenMethod.details && (
                                      <p className="text-xs text-blue-600 mt-2 leading-relaxed">{chosenMethod.details}</p>
                                    )}
                                  </div>
                                )}
                                {!hasDetails && (
                                  <p className="text-xs text-blue-600">A loja ira fornecer as coordenadas bancarias apos o pedido.</p>
                                )}

                                {/* Receipt upload */}
                                <div>
                                  <p className="text-xs font-semibold text-blue-700 flex items-center gap-1.5 mb-2">
                                    <Upload className="h-3.5 w-3.5" /> Comprovante de Pagamento
                                  </p>
                                  {receiptPreviews[sid] ? (
                                    <div className="flex items-center gap-3 bg-white rounded-lg px-3 py-2 border border-blue-100">
                                      {receiptPreviews[sid] === "pdf" ? (
                                        <div className="h-12 w-12 rounded-lg bg-red-50 flex items-center justify-center shrink-0">
                                          <FileText className="h-6 w-6 text-red-500" />
                                        </div>
                                      ) : (
                                        <img src={receiptPreviews[sid]} alt="" className="h-12 w-12 rounded-lg object-cover shrink-0" />
                                      )}
                                      <div className="flex-1 min-w-0">
                                        <p className="text-xs font-medium text-blue-900 truncate">{storeReceipts[sid]?.name}</p>
                                        <p className="text-[10px] text-blue-500">{((storeReceipts[sid]?.size || 0) / 1024).toFixed(0)} KB</p>
                                      </div>
                                      <button type="button" onClick={() => {
                                        setStoreReceipts(prev => { const n = { ...prev }; delete n[sid]; return n; });
                                        setReceiptPreviews(prev => { const n = { ...prev }; delete n[sid]; return n; });
                                      }} className="text-xs text-red-500 hover:underline">Remover</button>
                                    </div>
                                  ) : (
                                    <label className="flex items-center justify-center gap-2 w-full py-3 rounded-xl border-2 border-dashed border-blue-200 bg-white text-xs font-medium text-blue-600 hover:border-blue-400 hover:bg-blue-50/50 transition-colors cursor-pointer">
                                      <Upload className="h-4 w-4" /> Anexar comprovante (imagem ou PDF)
                                      <input type="file" accept="image/*,.pdf" className="hidden" onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                          setStoreReceipts(prev => ({ ...prev, [sid]: file }));
                                          if (file.type.startsWith("image/")) {
                                            setReceiptPreviews(prev => ({ ...prev, [sid]: URL.createObjectURL(file) }));
                                          } else {
                                            setReceiptPreviews(prev => ({ ...prev, [sid]: "pdf" }));
                                          }
                                        }
                                      }} />
                                    </label>
                                  )}
                                  <p className="text-[10px] text-blue-400 mt-1">Opcional — pode enviar depois pelo painel</p>
                                </div>
                              </div>
                            );
                          })()}
                        </div>
                      );
                    })}
                  </div>
                </div>

                <Button onClick={() => setStep("confirm")}
                  disabled={!canContinue}
                  className="w-full bg-hero-gradient text-primary-foreground hover:opacity-90 rounded-xl">
                  Continuar →
                </Button>
              </>
            )}

            {step === "confirm" && (
              <div className="space-y-4">
                <div className="rounded-2xl border border-border bg-card p-6">
                  <div className="flex items-center justify-between mb-3">
                    <h2 className="font-bold text-lg">Confirmar Pedido</h2>
                    <button onClick={() => setStep("info")} className="text-xs text-primary hover:underline">Editar dados</button>
                  </div>
                  <div className="grid grid-cols-2 gap-3 text-sm">
                    <div><span className="text-muted-foreground">Nome:</span> <span className="font-medium">{form.name}</span></div>
                    <div><span className="text-muted-foreground">Telefone:</span> <span className="font-medium">{form.phone}</span></div>
                    <div><span className="text-muted-foreground">Email:</span> <span className="font-medium">{form.email}</span></div>
                    <div className="col-span-2"><span className="text-muted-foreground">Endereco:</span> <span className="font-medium">{form.address}, {form.city}, {form.province}</span></div>
                  </div>
                </div>

                {/* Products by store + payment chosen */}
                {Object.entries(byStore).map(([sid, { store, items: storeItems }]) => {
                  const methods = getStoreMethods(store);
                  const chosen = methods.find(m => m.type === storePayments[sid]);
                  return (
                    <div key={store.id} className="rounded-2xl border border-border bg-card p-4">
                      <div className="flex items-center gap-2 mb-3 pb-2 border-b border-border">
                        <img src={logoSrc(store.logo, store.name)} alt={store.name} className="h-8 w-8 rounded-lg" onError={onImgError("logo", store.name)} />
                        <div className="flex-1">
                          <span className="font-semibold text-sm">{store.name}</span>
                          <p className="text-[11px] text-muted-foreground flex items-center gap-1"><CreditCard className="h-3 w-3" /> {chosen?.label || storePayments[sid]}</p>
                        </div>
                      </div>
                      {storeItems.map((item) => (
                        <div key={item.product.id} className="flex items-center gap-3 py-2">
                          <img src={item.product.images[0]} alt={item.product.name} className="h-12 w-12 rounded-lg object-cover" />
                          <div className="flex-1 min-w-0">
                            <p className="text-sm font-medium truncate">{item.product.name}</p>
                            <p className="text-xs text-muted-foreground">x{item.quantity}</p>
                          </div>
                          <span className="text-sm font-semibold">{formatPrice(item.product.price * item.quantity)} Kz</span>
                        </div>
                      ))}
                    </div>
                  );
                })}

                {stockErrors.length > 0 && (
                  <div className="rounded-xl border border-destructive/30 bg-destructive/5 p-4 space-y-1">
                    <div className="flex items-center gap-2 text-destructive font-semibold text-sm mb-1">
                      <AlertTriangle className="h-4 w-4" /> Stock insuficiente
                    </div>
                    {stockErrors.map((e, i) => <p key={i} className="text-xs text-destructive/80">{e}</p>)}
                  </div>
                )}

                <Button onClick={async () => {
                  setProcessing(true); setStockErrors([]);
                  try {
                    const fd = new FormData();
                    items.forEach((item, idx) => {
                      fd.append(`items[${idx}][product_id]`, String(Number(item.product.id)));
                      fd.append(`items[${idx}][quantity]`, String(item.quantity));
                    });
                    fd.append("customer[name]", form.name);
                    fd.append("customer[email]", form.email);
                    fd.append("customer[phone]", form.phone);
                    fd.append("customer[address]", form.address);
                    fd.append("customer[province]", form.province);
                    if (form.notes) fd.append("customer[notes]", form.notes);
                    Object.entries(storePayments).forEach(([sid, method]) => {
                      fd.append(`payment_methods[${sid}]`, method);
                    });
                    Object.entries(storeReceipts).forEach(([sid, file]) => {
                      fd.append(`receipt_${sid}`, file);
                    });

                    const res = await fetch(`${API}/checkout`, {
                      method: "POST",
                      headers: {
                        Accept: "application/json",
                        ...(token ? { Authorization: `Bearer ${token}` } : {}),
                      },
                      body: fd,
                    });
                    const d = await res.json();
                    if (res.ok) { setOrderNumbers(d.order_numbers || []); clearCart(); setStep("done"); }
                    else { setStockErrors(d.stock_errors || [d.error || "Erro ao processar pedido."]); }
                  } catch { setStockErrors(["Erro de conexao. Tente novamente."]); }
                  finally { setProcessing(false); }
                }} disabled={processing}
                  className="w-full bg-hero-gradient text-primary-foreground hover:opacity-90 rounded-xl gap-2 disabled:opacity-60">
                  {processing ? <Loader2 className="h-4 w-4 animate-spin" /> : <CheckCircle2 className="h-4 w-4" />}
                  {processing ? "A processar..." : `Confirmar Pedido — ${formatPrice(totalPrice + deliveryFee)} Kz`}
                </Button>
              </div>
            )}
          </div>

          {/* Sidebar Summary */}
          <div>
            <div className="rounded-2xl border border-border bg-card p-6 sticky top-24">
              <h3 className="font-bold mb-4">Resumo do Pedido</h3>
              <div className="space-y-2 text-sm mb-4">
                <div className="flex justify-between"><span className="text-muted-foreground">Subtotal ({items.reduce((a, i) => a + i.quantity, 0)} itens)</span><span>{formatPrice(totalPrice)} Kz</span></div>
                <div className="flex justify-between"><span className="text-muted-foreground">Entrega ({Object.keys(byStore).length} loja{Object.keys(byStore).length > 1 ? "s" : ""})</span><span>{formatPrice(deliveryFee)} Kz</span></div>
              </div>
              <div className="border-t border-border pt-3">
                <div className="flex justify-between font-bold text-lg"><span>Total</span><span>{formatPrice(totalPrice + deliveryFee)} Kz</span></div>
              </div>
              <div className="mt-4 space-y-2">
                {[
                  { icon: <Truck className="h-4 w-4 text-primary" />, text: "Entrega 2-5 dias" },
                  { icon: <ShieldCheck className="h-4 w-4 text-success" />, text: "Compra protegida" },
                ].map((b) => (
                  <div key={b.text} className="flex items-center gap-2 text-xs text-muted-foreground">
                    {b.icon} {b.text}
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>
    </main>
  );
};

export default Checkout;
