import { useAuth } from "@/contexts/AuthContext";
import { useAdminStyles } from "@/hooks/useAdminStyles";
import { useEffect, useState } from "react";
import { useOutletContext } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Tag, Check, Crown, Clock, AlertTriangle, Send, Info, Lock, X
} from "lucide-react";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

interface CategoryItem {
  id: number;
  name: string;
  slug: string;
  icon: string | null;
}

interface CategoriesData {
  categories: CategoryItem[];
  selected: number[];
  max_categories: number;
  can_change: boolean;
  cooldown_days: number;
  cooldown_until: string | null;
  days_remaining: number;
  categories_changed_at: string | null;
  plan_name: string;
  needs_request: boolean;
}

export default function StorePanelCategories() {
  const { token } = useAuth();
  const s = useAdminStyles();
  const { slug } = useOutletContext<{ slug: string }>();

  const [data, setData] = useState<CategoriesData | null>(null);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [selected, setSelected] = useState<number[]>([]);
  const [msg, setMsg] = useState<{ type: "success" | "error" | "info"; text: string } | null>(null);
  const [showRequestModal, setShowRequestModal] = useState(false);
  const [requestReason, setRequestReason] = useState("");
  const [requestIds, setRequestIds] = useState<number[]>([]);
  const [sendingRequest, setSendingRequest] = useState(false);

  const fetchData = () => {
    if (!token || !slug) return;
    setLoading(true);
    fetch(`${API}/store-panel/${slug}/categories`, {
      headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
    })
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .then((d) => {
        if (d && Array.isArray(d.categories)) {
          setData(d);
          setSelected(d.selected || []);
        }
      })
      .catch(() => {})
      .finally(() => setLoading(false));
  };

  useEffect(fetchData, [token, slug]);

  const toggleCategory = (id: number) => {
    if (!data) return;
    setSelected((prev) => {
      if (prev.includes(id)) return prev.filter((c) => c !== id);
      if (data.max_categories > 0 && prev.length >= data.max_categories) {
        setMsg({ type: "error", text: `O seu plano (${data.plan_name}) permite no maximo ${data.max_categories} categoria(s).` });
        setTimeout(() => setMsg(null), 4000);
        return prev;
      }
      return [...prev, id];
    });
  };

  const hasChanges = data ? JSON.stringify([...selected].sort()) !== JSON.stringify([...(data.selected || [])].sort()) : false;

  const saveCategories = async () => {
    if (!data || !hasChanges) return;

    if (!data.can_change) {
      setRequestIds(selected);
      setShowRequestModal(true);
      return;
    }

    setSaving(true);
    setMsg(null);
    try {
      const res = await fetch(`${API}/store-panel/${slug}/categories`, {
        method: "PUT",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ category_ids: selected }),
      });
      const json = await res.json();
      if (res.ok) {
        setMsg({ type: "success", text: json.message });
        fetchData();
      } else {
        setMsg({ type: "error", text: json.message || "Erro ao guardar." });
      }
    } catch {
      setMsg({ type: "error", text: "Erro de rede." });
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(null), 5000);
    }
  };

  const sendRequest = async () => {
    setSendingRequest(true);
    try {
      const res = await fetch(`${API}/store-panel/${slug}/categories/request-change`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ category_ids: requestIds, reason: requestReason }),
      });
      const json = await res.json();
      if (res.ok) {
        setMsg({ type: "success", text: json.message });
        setShowRequestModal(false);
        setRequestReason("");
      } else {
        setMsg({ type: "error", text: json.message || "Erro ao enviar pedido." });
      }
    } catch {
      setMsg({ type: "error", text: "Erro de rede." });
    } finally {
      setSendingRequest(false);
      setTimeout(() => setMsg(null), 5000);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <div className={`rounded-2xl border ${s.card} h-20 animate-pulse`} />
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
          {[...Array(8)].map((_, i) => (
            <div key={i} className={`rounded-2xl border ${s.card} h-20 animate-pulse`} />
          ))}
        </div>
      </div>
    );
  }

  if (!data) return <p className={`text-sm ${s.textMuted}`}>Erro ao carregar categorias.</p>;

  return (
    <div className="space-y-5">
      {/* Header */}
      <div className={`rounded-2xl border ${s.card} p-4 sm:p-5`}>
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3">
          <div>
            <h2 className={`text-lg font-bold ${s.textPrimary}`}>Categorias da Loja</h2>
            <p className={`text-xs ${s.textMuted} mt-0.5`}>
              Selecione as categorias em que a sua loja opera
            </p>
          </div>
          <div className="flex items-center gap-2">
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold ${s.isDark ? "bg-purple-500/15 text-purple-400" : "bg-purple-50 text-purple-600"}`}>
              <Crown className="h-3 w-3" /> {data.plan_name}
            </span>
            <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-[10px] font-bold ${s.badge("blue")}`}>
              <Tag className="h-3 w-3" /> {data.max_categories === 0 ? "Ilimitadas" : `Max ${data.max_categories}`}
            </span>
          </div>
        </div>
      </div>

      {/* Cooldown Warning */}
      {!data.can_change && (
        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
          className={`rounded-2xl border ${s.isDark ? "border-amber-500/20 bg-amber-500/5" : "border-amber-200 bg-amber-50"} p-4 flex items-start gap-3`}>
          <Clock className="h-5 w-5 text-amber-500 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-sm font-semibold text-amber-600">Periodo de espera activo</p>
            <p className={`text-xs ${s.isDark ? "text-amber-400/70" : "text-amber-600/70"} mt-0.5`}>
              Pode trocar de categorias novamente em <strong>{data.days_remaining} dia(s)</strong>
              {data.cooldown_until && (
                <> (ate {new Date(data.cooldown_until).toLocaleDateString("pt-AO")})</>
              )}.
              Se precisar trocar antes, pode solicitar ao administrador.
            </p>
          </div>
        </motion.div>
      )}

      {/* Info box */}
      <div className={`rounded-2xl border ${s.isDark ? "border-blue-500/20 bg-blue-500/5" : "border-blue-100 bg-blue-50/50"} p-3.5 flex items-start gap-3`}>
        <Info className="h-4 w-4 text-blue-500 flex-shrink-0 mt-0.5" />
        <div className={`text-xs ${s.isDark ? "text-blue-400/80" : "text-blue-600/80"}`}>
          <p>As categorias determinam onde a sua loja aparece no marketplace.</p>
          {data.cooldown_days > 0 && (
            <p className="mt-1">Apos alterar categorias, tera de aguardar <strong>{data.cooldown_days} dias</strong> para poder trocar novamente.</p>
          )}
          {data.max_categories === 1 && (
            <p className="mt-1">O seu plano permite apenas <strong>1 categoria</strong>. Faca upgrade para selecionar mais categorias.</p>
          )}
        </div>
      </div>

      {/* Message */}
      {msg && (
        <motion.div initial={{ opacity: 0, y: -5 }} animate={{ opacity: 1, y: 0 }}
          className={`rounded-xl p-3 text-sm font-medium ${
            msg.type === "success" ? (s.isDark ? "bg-green-500/10 text-green-400" : "bg-green-50 text-green-700") :
            msg.type === "error" ? (s.isDark ? "bg-red-500/10 text-red-400" : "bg-red-50 text-red-700") :
            (s.isDark ? "bg-blue-500/10 text-blue-400" : "bg-blue-50 text-blue-700")
          }`}>
          {msg.text}
        </motion.div>
      )}

      {/* Categories Grid */}
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3">
        {data.categories.map((cat, i) => {
          const isSelected = selected.includes(cat.id);
          const isDisabled = !data.can_change && !isSelected;

          return (
            <motion.button
              key={cat.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: i * 0.02 }}
              onClick={() => !isDisabled && toggleCategory(cat.id)}
              disabled={isDisabled}
              className={`relative rounded-2xl border p-4 text-left transition-all duration-200 ${
                isSelected
                  ? s.isDark
                    ? "border-emerald-500/40 bg-emerald-500/10 ring-1 ring-emerald-500/20"
                    : "border-emerald-300 bg-emerald-50 ring-1 ring-emerald-200 shadow-sm"
                  : isDisabled
                    ? s.isDark
                      ? "border-white/[0.04] bg-white/[0.01] opacity-40 cursor-not-allowed"
                      : "border-gray-100 bg-gray-50/50 opacity-40 cursor-not-allowed"
                    : s.isDark
                      ? "border-white/[0.06] bg-[#1a1c23] hover:border-white/[0.12] hover:bg-white/[0.03] cursor-pointer"
                      : "border-gray-200 bg-white hover:border-gray-300 hover:shadow-sm cursor-pointer"
              }`}
            >
              {isSelected && (
                <div className="absolute top-2.5 right-2.5">
                  <div className="h-5 w-5 rounded-full bg-emerald-500 flex items-center justify-center">
                    <Check className="h-3 w-3 text-white" />
                  </div>
                </div>
              )}
              {isDisabled && (
                <div className="absolute top-2.5 right-2.5">
                  <Lock className={`h-3.5 w-3.5 ${s.textMuted}`} />
                </div>
              )}
              <div className="flex items-center gap-2.5">
                {cat.icon ? (
                  <span className="text-xl">{cat.icon}</span>
                ) : (
                  <div className={`h-8 w-8 rounded-lg ${s.isDark ? "bg-white/5" : "bg-gray-100"} flex items-center justify-center`}>
                    <Tag className={`h-4 w-4 ${isSelected ? "text-emerald-500" : s.textMuted}`} />
                  </div>
                )}
                <div>
                  <p className={`text-sm font-semibold ${isSelected ? (s.isDark ? "text-emerald-400" : "text-emerald-700") : s.textPrimary}`}>
                    {cat.name}
                  </p>
                </div>
              </div>
            </motion.button>
          );
        })}
      </div>

      {/* Selected summary + save */}
      <div className={`rounded-2xl border ${s.card} p-4 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 sticky bottom-4`}>
        <div>
          <p className={`text-xs font-semibold ${s.textPrimary}`}>
            {selected.length} de {data.max_categories === 0 ? "∞" : data.max_categories} categoria(s) selecionada(s)
          </p>
          <p className={`text-[10px] ${s.textMuted} mt-0.5`}>
            {selected.length === 0 ? "Selecione pelo menos uma categoria" :
              data.categories.filter(c => selected.includes(c.id)).map(c => c.name).join(", ")}
          </p>
        </div>
        <div className="flex items-center gap-2">
          {!data.can_change && hasChanges && (
            <button
              onClick={() => { setRequestIds(selected); setShowRequestModal(true); }}
              className={`px-4 py-2 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition-colors ${
                s.isDark ? "bg-amber-500/15 text-amber-400 hover:bg-amber-500/25" : "bg-amber-50 text-amber-700 hover:bg-amber-100"
              }`}
            >
              <Send className="h-3.5 w-3.5" /> Solicitar Troca
            </button>
          )}
          <button
            onClick={saveCategories}
            disabled={!hasChanges || selected.length === 0 || saving || (!data.can_change)}
            className={`px-5 py-2 rounded-xl text-xs font-semibold transition-colors flex items-center gap-1.5 ${
              hasChanges && selected.length > 0 && data.can_change && !saving
                ? "bg-emerald-500 hover:bg-emerald-600 text-white"
                : s.isDark ? "bg-white/5 text-white/20 cursor-not-allowed" : "bg-gray-100 text-gray-300 cursor-not-allowed"
            }`}
          >
            {saving ? (
              <><span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> A guardar...</>
            ) : (
              <><Check className="h-3.5 w-3.5" /> Guardar Categorias</>
            )}
          </button>
        </div>
      </div>

      {/* Request Change Modal */}
      {showRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/50 backdrop-blur-sm" onClick={() => setShowRequestModal(false)} />
          <motion.div initial={{ opacity: 0, scale: 0.95 }} animate={{ opacity: 1, scale: 1 }}
            className={`relative w-full max-w-md rounded-2xl border ${s.card} p-5 z-10`}>
            <button onClick={() => setShowRequestModal(false)} className={`absolute top-3 right-3 p-1 rounded-lg ${s.textMuted} hover:${s.textPrimary}`}>
              <X className="h-4 w-4" />
            </button>
            <div className="flex items-center gap-3 mb-4">
              <div className={`h-10 w-10 rounded-xl ${s.isDark ? "bg-amber-500/10" : "bg-amber-50"} flex items-center justify-center`}>
                <Send className="h-5 w-5 text-amber-500" />
              </div>
              <div>
                <h3 className={`text-sm font-bold ${s.textPrimary}`}>Solicitar Troca de Categorias</h3>
                <p className={`text-[10px] ${s.textMuted}`}>O administrador ira analisar o seu pedido</p>
              </div>
            </div>

            <div className="mb-3">
              <p className={`text-xs ${s.textSecondary} mb-2`}>Categorias solicitadas:</p>
              <div className="flex flex-wrap gap-1.5">
                {data.categories.filter(c => requestIds.includes(c.id)).map(c => (
                  <span key={c.id} className={`px-2 py-1 rounded-lg text-[10px] font-semibold ${s.badge("blue")}`}>
                    {c.icon && <span className="mr-1">{c.icon}</span>}{c.name}
                  </span>
                ))}
              </div>
            </div>

            <div className="mb-4">
              <label className={`text-xs font-medium ${s.textSecondary} block mb-1.5`}>Motivo (opcional)</label>
              <textarea
                value={requestReason}
                onChange={(e) => setRequestReason(e.target.value)}
                rows={3}
                placeholder="Explique porque pretende trocar de categoria..."
                className={`w-full rounded-xl border px-3 py-2 text-xs ${s.input} resize-none`}
              />
            </div>

            <div className="flex justify-end gap-2">
              <button onClick={() => setShowRequestModal(false)}
                className={`px-4 py-2 rounded-xl text-xs font-semibold ${s.btnSecondary}`}>
                Cancelar
              </button>
              <button onClick={sendRequest} disabled={sendingRequest}
                className="px-4 py-2 rounded-xl text-xs font-semibold bg-amber-500 hover:bg-amber-600 text-white flex items-center gap-1.5">
                {sendingRequest ? (
                  <><span className="h-3.5 w-3.5 border-2 border-white/30 border-t-white rounded-full animate-spin" /> A enviar...</>
                ) : (
                  <><Send className="h-3.5 w-3.5" /> Enviar Pedido</>
                )}
              </button>
            </div>
          </motion.div>
        </div>
      )}
    </div>
  );
}
