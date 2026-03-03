import { useState, useEffect, useCallback } from "react";
import { Star, Send, User, Loader2, Trash2, LogIn, ChevronDown } from "lucide-react";
import { Button } from "@/components/ui/button";
import { useAuth } from "@/contexts/AuthContext";
import { Link } from "react-router-dom";

const API = import.meta.env.VITE_API_URL || "http://127.0.0.1:8000/api";

interface ReviewItem {
  id: number;
  author_name: string;
  rating: number;
  comment: string;
  user_id: number | null;
  created_at: string;
}

interface ReviewSectionProps {
  type: "product" | "store";
  targetId: number | string;
  targetName: string;
  averageRating: number;
  totalReviews: number;
}

export function ReviewSection({ type, targetId, targetName, averageRating, totalReviews }: ReviewSectionProps) {
  const { user, token } = useAuth();
  const [reviews, setReviews] = useState<ReviewItem[]>([]);
  const [distribution, setDistribution] = useState<Record<number, number>>({});
  const [avgRating, setAvgRating] = useState(averageRating);
  const [totalCount, setTotalCount] = useState(totalReviews);
  const [loading, setLoading] = useState(true);
  const [newRating, setNewRating] = useState(0);
  const [hoverRating, setHoverRating] = useState(0);
  const [newComment, setNewComment] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [myReviewId, setMyReviewId] = useState<number | null>(null);
  const [error, setError] = useState("");
  const [page, setPage] = useState(1);
  const [hasMore, setHasMore] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const fetchReviews = useCallback(async (pageNum = 1, append = false) => {
    if (pageNum === 1) setLoading(true);
    else setLoadingMore(true);
    try {
      const res = await fetch(`${API}/reviews?type=${type}&id=${targetId}&page=${pageNum}&per_page=10`);
      if (res.ok) {
        const data = await res.json();
        const items: ReviewItem[] = data.reviews?.data || [];
        setReviews((prev) => append ? [...prev, ...items] : items);
        setDistribution(data.distribution || {});
        setAvgRating(data.average_rating ?? averageRating);
        setTotalCount(data.total_reviews ?? totalReviews);
        setHasMore((data.reviews?.current_page ?? 1) < (data.reviews?.last_page ?? 1));
        setPage(pageNum);
      }
    } catch {}
    setLoading(false);
    setLoadingMore(false);
  }, [type, targetId]);

  // Check if user already has a review
  const checkMyReview = useCallback(async () => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/reviews/mine?type=${type}&id=${targetId}`, {
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      if (res.ok) {
        const data = await res.json();
        if (data.review) {
          setMyReviewId(data.review.id);
          setNewRating(data.review.rating);
          setNewComment(data.review.comment);
        }
      }
    } catch {}
  }, [token, type, targetId]);

  useEffect(() => { fetchReviews(); }, [fetchReviews]);
  useEffect(() => { checkMyReview(); }, [checkMyReview]);

  const handleSubmit = async () => {
    if (!token || !newRating || !newComment.trim()) return;
    setSubmitting(true);
    setError("");
    try {
      const res = await fetch(`${API}/reviews`, {
        method: "POST",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json", "Content-Type": "application/json" },
        body: JSON.stringify({ type, reviewable_id: targetId, rating: newRating, comment: newComment }),
      });
      if (res.ok) {
        const data = await res.json();
        setMyReviewId(data.review.id);
        setShowForm(false);
        fetchReviews();
      } else {
        const data = await res.json();
        setError(data.message || "Erro ao enviar avaliacao.");
      }
    } catch { setError("Erro de conexao."); }
    setSubmitting(false);
  };

  const handleDelete = async (id: number) => {
    if (!token || !confirm("Eliminar a sua avaliacao?")) return;
    try {
      const res = await fetch(`${API}/reviews/${id}`, {
        method: "DELETE",
        headers: { Authorization: `Bearer ${token}`, Accept: "application/json" },
      });
      if (res.ok) {
        setMyReviewId(null);
        setNewRating(0);
        setNewComment("");
        fetchReviews();
      }
    } catch {}
  };

  const ratingDistribution = [5, 4, 3, 2, 1].map((star) => {
    const count = distribution[star] || 0;
    const pct = totalCount > 0 ? Math.round((count / totalCount) * 100) : 0;
    return { star, count, pct };
  });

  return (
    <div>
      <div className="flex items-center justify-between mb-4">
        <h3 className="font-bold text-lg">Avaliacoes {type === "store" ? "da Loja" : "do Produto"}</h3>
        {user ? (
          <Button size="sm" variant="outline" className="gap-1 rounded-xl text-xs" onClick={() => setShowForm(!showForm)}>
            <Star className="h-3.5 w-3.5" /> {myReviewId ? "Editar Avaliacao" : "Avaliar"}
          </Button>
        ) : (
          <Link to="/entrar">
            <Button size="sm" variant="outline" className="gap-1 rounded-xl text-xs">
              <LogIn className="h-3.5 w-3.5" /> Entrar para Avaliar
            </Button>
          </Link>
        )}
      </div>

      {/* Summary */}
      <div className="flex items-start gap-6 mb-6">
        <div className="text-center">
          <span className="text-4xl font-extrabold block">{avgRating}</span>
          <div className="flex items-center gap-0.5 mt-1">
            {[1, 2, 3, 4, 5].map((s) => (
              <Star key={s} className={`h-3.5 w-3.5 ${s <= Math.round(avgRating) ? "fill-warning text-warning" : "text-border"}`} />
            ))}
          </div>
          <p className="text-xs text-muted-foreground mt-1">{totalCount} avaliacoes</p>
        </div>
        <div className="flex-1 space-y-1">
          {ratingDistribution.map(({ star, pct }) => (
            <div key={star} className="flex items-center gap-2">
              <span className="text-xs w-3 text-right text-muted-foreground">{star}</span>
              <Star className="h-3 w-3 text-warning fill-warning" />
              <div className="flex-1 h-2 rounded-full bg-secondary overflow-hidden">
                <div className="h-full rounded-full bg-warning transition-all" style={{ width: `${pct}%` }} />
              </div>
              <span className="text-[10px] text-muted-foreground w-8">{pct}%</span>
            </div>
          ))}
        </div>
      </div>

      {/* New Review Form */}
      {showForm && user && (
        <div className="mb-6 p-4 rounded-xl bg-secondary/50 border border-border">
          <p className="text-sm font-medium mb-1">{myReviewId ? "Editar a sua avaliacao" : "A sua avaliacao"} para {targetName}</p>
          <p className="text-[11px] text-muted-foreground mb-3">Como {user.name}</p>
          {error && <p className="text-xs text-destructive mb-2">{error}</p>}
          <div className="flex items-center gap-1 mb-3">
            {[1, 2, 3, 4, 5].map((s) => (
              <button key={s}
                onMouseEnter={() => setHoverRating(s)}
                onMouseLeave={() => setHoverRating(0)}
                onClick={() => setNewRating(s)}
              >
                <Star className={`h-6 w-6 cursor-pointer transition-colors ${s <= (hoverRating || newRating) ? "fill-warning text-warning" : "text-border"}`} />
              </button>
            ))}
            {newRating > 0 && <span className="text-sm text-muted-foreground ml-2">{newRating}/5</span>}
          </div>
          <textarea
            placeholder="Escreva o seu comentario..."
            value={newComment}
            onChange={(e) => setNewComment(e.target.value)}
            rows={3}
            className="w-full rounded-lg border border-border bg-card px-3 py-2 text-sm resize-none focus:outline-none focus:ring-2 focus:ring-ring"
          />
          <div className="flex items-center justify-between mt-2">
            <button onClick={() => setShowForm(false)} className="text-xs text-muted-foreground hover:text-foreground transition-colors">Cancelar</button>
            <Button size="sm" onClick={handleSubmit} disabled={submitting || !newRating || !newComment.trim()}
              className="gap-1 rounded-xl bg-hero-gradient text-primary-foreground hover:opacity-90">
              {submitting ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />}
              {myReviewId ? "Actualizar" : "Enviar Avaliacao"}
            </Button>
          </div>
        </div>
      )}

      {/* Reviews List */}
      {loading ? (
        <div className="text-center py-8"><Loader2 className="h-5 w-5 animate-spin mx-auto text-muted-foreground" /></div>
      ) : reviews.length === 0 ? (
        <div className="text-center py-8">
          <Star className="h-8 w-8 text-muted-foreground/30 mx-auto mb-2" />
          <p className="text-sm text-muted-foreground">Ainda sem avaliacoes. Seja o primeiro!</p>
        </div>
      ) : (
        <div className="space-y-4">
          {reviews.map((review) => (
            <div key={review.id} className="flex gap-3 pb-4 border-b border-border last:border-0 last:pb-0">
              <div className="h-9 w-9 rounded-full bg-primary/10 flex items-center justify-center flex-shrink-0">
                <User className="h-4 w-4 text-primary" />
              </div>
              <div className="flex-1">
                <div className="flex items-center gap-2 mb-0.5">
                  <span className="text-sm font-semibold">{review.author_name}</span>
                  <span className="text-[10px] text-muted-foreground">{new Date(review.created_at).toLocaleDateString("pt-AO")}</span>
                  {user && (review.user_id === user.id || user.role === "super_admin") && (
                    <button onClick={() => handleDelete(review.id)} className="text-muted-foreground hover:text-destructive transition-colors ml-auto" title="Eliminar">
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}
                </div>
                <div className="flex items-center gap-0.5 mb-1">
                  {[1, 2, 3, 4, 5].map((s) => (
                    <Star key={s} className={`h-3 w-3 ${s <= review.rating ? "fill-warning text-warning" : "text-border"}`} />
                  ))}
                </div>
                <p className="text-sm text-muted-foreground">{review.comment}</p>
              </div>
            </div>
          ))}

          {hasMore && (
            <div className="text-center pt-2">
              <Button size="sm" variant="ghost" className="gap-1 text-xs" onClick={() => fetchReviews(page + 1, true)} disabled={loadingMore}>
                {loadingMore ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <ChevronDown className="h-3.5 w-3.5" />}
                Ver mais avaliacoes
              </Button>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
