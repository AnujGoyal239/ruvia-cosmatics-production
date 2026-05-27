"use client";

import { useParams, useRouter, useSearchParams } from "next/navigation";
import { useState, useEffect, useMemo } from "react";
import { apiUrl } from "../../../constants";
import { useAuth } from "../../../context/AuthContext";
import { 
  Star, ShieldCheck, Truck, RefreshCcw, ShoppingBag, 
  Plus, Minus, ArrowLeft, ChevronRight, Heart, X,
  Droplets, Zap, CheckCircle2, FlaskConical, Sparkles,
  MessageSquare, User, Calendar
} from "lucide-react";
import { useCart } from "../../../context/CartContext";
import { useWishlist } from "../../../context/WishlistContext";
import { Button } from "../../../components/ui/Button";
import ProductImage from "../../../components/ui/ProductImage";
import Link from "next/link";

export default function ProductDetailPage() {
  const { id } = useParams();
  const router = useRouter();
  const searchParams = useSearchParams();
  const { user } = useAuth();
  const { addToCart } = useCart();
  const { toggleWishlist, isInWishlist, addToWishlist } = useWishlist();
  const [products, setProducts] = useState([]);
  const [reviews, setReviews] = useState([]);
  const [quantity, setQuantity] = useState(1);
  const [isAdded, setIsAdded] = useState(false);
  const [selectedImage, setSelectedImage] = useState(0);
  const [reviewFilter, setReviewFilter] = useState("All");
  const [selectedReview, setSelectedReview] = useState(null);
  const [isReviewModalOpen, setIsReviewModalOpen] = useState(false);
  const [helpfulVotes, setHelpfulVotes] = useState({});
  const [reviewRating, setReviewRating] = useState(5);
  const [reviewComment, setReviewComment] = useState("");
  const [reviewSubmitting, setReviewSubmitting] = useState(false);
  const [reviewError, setReviewError] = useState("");
  const [loading, setLoading] = useState(true);
  const [reviewsLoading, setReviewsLoading] = useState(true);

  const product = useMemo(() => products.find((item) => item.id === id), [products, id]);

  const liveHighlights = useMemo(() => {
    if (!product) return [];

    return [
      {
        stat: `${Number(product.rating || 0).toFixed(1)}`,
        text: `${product.reviews || 0} live ratings from the backend`,
      },
      {
        stat: `${(product.ingredients || []).length}`,
        text: "Ingredients synced from catalog data",
      },
      {
        stat: `${(product.benefits || []).length}`,
        text: "Benefits available in the product record",
      },
    ];
  }, [product]);

  const filteredReviews = useMemo(() => {
    if (reviewFilter === "All") return reviews;
    return reviews.filter(r => r.rating === parseInt(reviewFilter));
  }, [reviewFilter, reviews]);

  const allOtherProducts = useMemo(() => {
    if (!product) return [];
    return products.filter(p => p.id !== product.id);
  }, [products, product?.id]);

  const toggleHelpful = (id) => {
    setHelpfulVotes(prev => ({
      ...prev,
      [id]: !prev[id]
    }));
  };

  useEffect(() => {
    const loadProducts = async () => {
      try {
        const res = await fetch(apiUrl("/api/products"));
        if (!res.ok) throw new Error("Failed to load products");
        const data = await res.json();
        const items = Array.isArray(data)
          ? data
          : Array.isArray(data?.data)
            ? data.data
            : [];
        setProducts(items);
      } catch (error) {
        console.error(error);
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  useEffect(() => {
    const loadReviews = async () => {
      if (!product?._id) return;

      try {
        setReviewsLoading(true);
        const res = await fetch(apiUrl(`/api/reviews/product/${product._id}`));
        const data = await res.json();
        setReviews(Array.isArray(data) ? data : []);
      } catch (error) {
        console.error(error);
        setReviews([]);
      } finally {
        setReviewsLoading(false);
      }
    };

    loadReviews();
  }, [product?._id]);

  useEffect(() => {
    if (!loading && !product) {
      router.push("/shop");
    }
    window.scrollTo(0, 0);
  }, [loading, product, router]);

  useEffect(() => {
    if (searchParams.get("write_review") === "true") {
      setIsReviewModalOpen(true);
    }
  }, [searchParams]);

  if (loading || !product) return null;

  const handleAddToCart = () => {
    addToCart({ ...product, quantity });
    setIsAdded(true);
    setTimeout(() => setIsAdded(false), 2000);
  };

  const handleReviewSubmit = async (event) => {
    event.preventDefault();

    if (!user) {
      router.push(`/auth?redirect=${encodeURIComponent(`/shop/${product.id}?write_review=true`)}`);
      return;
    }

    try {
      setReviewSubmitting(true);
      setReviewError("");

      const response = await fetch(apiUrl("/api/reviews"), {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        credentials: "include",
        body: JSON.stringify({
          productId: product._id,
          rating: reviewRating,
          comment: reviewComment.trim(),
          name: user.name || "Customer",
        }),
      });

      const data = await response.json();
      if (!response.ok) {
        throw new Error(data?.message || "Failed to submit review");
      }

      setReviews((current) => [data, ...current]);
      setIsReviewModalOpen(false);
      setReviewComment("");
      setReviewRating(5);
    } catch (error) {
      setReviewError(error.message || "Failed to submit review");
    } finally {
      setReviewSubmitting(false);
    }
  };

  const handleBuyNow = () => {
    addToCart({ ...product, quantity });
    router.push("/checkout");
  };

  return (
    <div className="min-h-screen pt-32 pb-20 bg-[#FDFBF7] selection:bg-brand-pink/30 font-sans relative">
      
      {/* ══════ REVIEW DETAIL MODAL ══════ */}
      {selectedReview && (
        <div className="fixed inset-0 z-300 flex items-center justify-center p-6">
          <div 
            className="absolute inset-0 bg-brand-dark/60 backdrop-blur-md animate-in fade-in duration-500" 
            onClick={() => setSelectedReview(null)}
          />
          <div className="relative bg-white w-full max-w-2xl rounded-[3rem] p-12 shadow-2xl animate-in zoom-in fade-in duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]">
            <button 
              onClick={() => setSelectedReview(null)}
              className="absolute top-8 right-8 w-12 h-12 rounded-full border border-brand-dark/10 flex items-center justify-center text-brand-dark hover:bg-brand-pink hover:text-white transition-all"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-6 mb-10">
              <div className="w-16 h-16 rounded-full bg-brand-beige flex items-center justify-center text-brand-dark/40">
                <User size={32} />
              </div>
              <div>
                <h4 className="font-serif text-3xl font-bold text-brand-dark">{selectedReview.name}</h4>
                <div className="flex items-center gap-3">
                  <div className="flex gap-1 text-brand-pink">
                    {[...Array(5)].map((_, j) => <Star key={j} size={16} fill={j < selectedReview.rating ? "currentColor" : "none"} />)}
                  </div>
                  <span className="text-xs font-black text-green-500 uppercase tracking-widest">Live Review</span>
                </div>
              </div>
            </div>

            <div className="space-y-6">
              <h5 className="font-serif text-2xl font-bold text-brand-dark">Detailed Ritual Experience</h5>
              <p className="text-lg text-brand-dark/60 leading-relaxed italic">"{selectedReview.comment}"</p>
              <div className="pt-6 border-t border-brand-dark/5 flex items-center justify-between">
                <span className="text-[10px] font-black text-brand-dark/30 uppercase tracking-[0.2em]">{selectedReview.createdAt ? new Date(selectedReview.createdAt).toLocaleDateString("en-IN", { day: "2-digit", month: "short", year: "numeric" }) : "Just now"}</span>
                <div className="flex gap-4">
                  <button 
                    onClick={() => toggleHelpful(selectedReview._id || selectedReview.id)}
                    className={`flex items-center gap-2 px-6 py-3 rounded-xl border transition-all text-[10px] font-black uppercase tracking-widest ${helpfulVotes[selectedReview._id || selectedReview.id] ? 'bg-brand-pink border-brand-pink text-white shadow-lg' : 'border-brand-dark/10 text-brand-dark hover:bg-brand-pink hover:text-white'}`}
                  >
                    <CheckCircle2 size={14} /> {helpfulVotes[selectedReview._id || selectedReview.id] ? 'Helpful' : 'Mark Helpful'}
                  </button>
                  <button className="text-[10px] font-black uppercase tracking-widest text-brand-dark/20 hover:text-red-500 transition-colors">
                    Report
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ══════ WRITE REVIEW MODAL ══════ */}
      {isReviewModalOpen && (
        <div className="fixed inset-0 z-300 flex items-center justify-center p-6">
          <div 
            className="absolute inset-0 bg-brand-dark/60 backdrop-blur-md animate-in fade-in duration-500" 
            onClick={() => setIsReviewModalOpen(false)}
          />
          <div className="relative bg-white w-full max-w-xl rounded-[3rem] p-12 shadow-2xl animate-in zoom-in fade-in duration-500 ease-[cubic-bezier(0.16,1,0.3,1)]">
            <button 
              onClick={() => setIsReviewModalOpen(false)}
              className="absolute top-8 right-8 w-12 h-12 rounded-full border border-brand-dark/10 flex items-center justify-center text-brand-dark hover:bg-brand-pink hover:text-white transition-all"
            >
              <X size={20} />
            </button>

            <div className="flex items-center gap-4 mb-8">
              <div className="w-12 h-12 rounded-full bg-brand-beige flex items-center justify-center text-brand-dark/40 overflow-hidden">
                <User size={24} />
              </div>
              <div>
                <p className="text-[10px] font-black uppercase tracking-widest text-brand-dark/40">Posting as</p>
                <p className="text-sm font-bold text-brand-dark">{user?.name || "Customer"}</p>
              </div>
            </div>

            <h3 className="font-serif text-4xl font-bold text-brand-dark mb-4">Share Your <br /><span className="text-brand-pink italic">Skin Story.</span></h3>
            
            <form className="space-y-8" onSubmit={handleReviewSubmit}>
              <div className="space-y-3">
                <p className="text-[10px] font-black uppercase tracking-widest text-brand-dark/30">Your Rating</p>
                <div className="flex gap-2 text-brand-pink">
                  {[...Array(5)].map((_, i) => (
                    <button
                      key={i}
                      type="button"
                      onClick={() => setReviewRating(i + 1)}
                      className="transition-transform hover:scale-110"
                    >
                      <Star size={24} fill={i < reviewRating ? "currentColor" : "none"} />
                    </button>
                  ))}
                </div>
              </div>

              <div className="space-y-6">
                <input 
                  type="text" 
                  value={user?.name || "Customer"}
                  readOnly
                  className="w-full bg-brand-beige/10 border border-brand-dark/5 rounded-2xl px-6 py-4 outline-none text-sm font-bold text-brand-dark/40 cursor-not-allowed"
                />
                <textarea 
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  placeholder="Tell us about the texture, scent, and results..." 
                  rows={4}
                  className="w-full bg-brand-beige/20 border border-brand-dark/5 rounded-4xl px-6 py-6 outline-none focus:border-brand-pink transition-colors text-sm font-bold resize-none"
                  required
                />
              </div>

              {reviewError && <p className="text-[10px] font-black uppercase tracking-widest text-red-500">{reviewError}</p>}

              <button 
                type="submit"
                disabled={reviewSubmitting}
                className="w-full h-16 rounded-2xl bg-brand-dark text-white text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl shadow-brand-dark/20 hover:bg-brand-pink transition-all duration-500 disabled:opacity-60 disabled:cursor-not-allowed"
              >
                {reviewSubmitting ? "Submitting..." : "Submit Ritual Review"}
              </button>
            </form>
          </div>
        </div>
      )}

      <div className="container mx-auto px-6 md:px-12">
        
        {/* Breadcrumb ... (unchanged) */}
        <div className="flex items-center gap-4 mb-12 text-[10px] font-black tracking-widest uppercase text-brand-dark/40">
          <Link href="/shop" className="hover:text-brand-pink transition-colors">Collection</Link>
          <ChevronRight size={10} />
          <span className="text-brand-dark/20">{product.category}</span>
          <ChevronRight size={10} />
          <span className="text-brand-dark">{product.name}</span>
        </div>

        {/* ══════ MAIN PRODUCT HERO ══════ */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-16 lg:gap-24 mb-32">
          
          {/* Left Column: Image Gallery */}
          <div className="lg:col-span-7 flex flex-col md:flex-row gap-6">
            {(() => {
              // Source the gallery from the product. Falls back to a
              // single-entry array using the primary image when older docs
              // don't have the `images` field populated.
              const gallery =
                Array.isArray(product.images) && product.images.length > 0
                  ? product.images
                  : product.image
                  ? [product.image]
                  : [];
              const safeIndex = Math.min(selectedImage || 0, Math.max(0, gallery.length - 1));
              const heroSrc = gallery[safeIndex] || product.image;

              return (
                <>
                  <div className="order-2 md:order-1 flex md:flex-col gap-4">
                    {gallery.map((src, i) => (
                      <button
                        key={`${src}-${i}`}
                        onClick={() => setSelectedImage(i)}
                        className={`w-20 h-20 md:w-24 md:h-24 rounded-3xl overflow-hidden border-2 transition-all duration-500 bg-white ${safeIndex === i ? 'border-brand-pink shadow-lg' : 'border-transparent hover:border-brand-pink/30'}`}
                      >
                        <ProductImage
                          src={src}
                          alt={`${product.name} thumbnail ${i + 1}`}
                          className={`w-full h-full object-cover mix-blend-multiply ${safeIndex === i ? 'scale-110 opacity-100' : 'opacity-40'}`}
                          iconSize={22}
                        />
                      </button>
                    ))}
                  </div>

                  <div className="order-1 md:order-2 flex-1 aspect-4/5 rounded-[3.5rem] overflow-hidden bg-white border border-brand-dark/3 shadow-2xl shadow-brand-dark/3 relative group">
                    <ProductImage
                      src={heroSrc}
                      alt={product.name}
                      className="w-full h-full object-cover transition-transform duration-3000 group-hover:scale-105 mix-blend-multiply"
                      iconSize={56}
                    />
                    <div className="absolute top-8 left-8">
                      <span className="bg-brand-dark text-white px-5 py-2 rounded-xl text-[9px] font-black uppercase tracking-[0.3em] shadow-2xl">
                        {product.category}
                      </span>
                    </div>
                    <button
                      onClick={() => toggleWishlist(product)}
                      className="absolute top-8 right-8 w-14 h-14 rounded-full bg-white/90 backdrop-blur-xl flex items-center justify-center text-brand-dark hover:bg-brand-pink hover:text-white transition-all shadow-xl z-10"
                    >
                      <Heart size={20} className={isInWishlist(product.id) ? "fill-brand-pink text-brand-pink" : ""} />
                    </button>
                  </div>
                </>
              );
            })()}
          </div>

          <div className="lg:col-span-5 flex flex-col">
            <div className="mb-10 space-y-6">
              <div className="flex items-center gap-3 text-brand-pink">
                <Sparkles size={16} />
                <span className="text-[10px] font-black uppercase tracking-[0.4em]">Amazon Choice / Top Rated</span>
              </div>
              <h1 className="font-serif text-5xl md:text-7xl font-bold tracking-tighter text-brand-dark leading-[0.9]">
                {product.name}
              </h1>
              <div className="flex items-center gap-6">
                <div className="flex items-center gap-2">
                  <div className="flex gap-0.5">
                    {[...Array(5)].map((_, i) => (
                      <Star key={i} size={14} className={i < Math.floor(product.rating) ? "fill-brand-pink text-brand-pink" : "text-brand-dark/10"} />
                    ))}
                  </div>
                  <span className="text-[11px] font-black text-brand-dark">{product.rating}</span>
                </div>
                <div className="h-4 w-px bg-brand-dark/10" />
                <button className="text-[11px] font-black text-brand-dark/30 tracking-widest uppercase hover:text-brand-pink transition-colors">
                  {product.reviews} Ratings
                </button>
              </div>
              <div className="flex items-baseline gap-4">
                <span className="font-serif text-5xl font-bold text-brand-dark">₹{product.price.toLocaleString('en-IN')}</span>
                <span className="text-brand-dark/20 text-lg font-medium line-through">₹{(product.price * 1.2).toLocaleString('en-IN')}</span>
                <span className="text-brand-pink text-[10px] font-black tracking-widest uppercase bg-brand-pink/5 px-3 py-1 rounded-lg">20% OFF</span>
              </div>
              <p className="text-brand-dark/60 text-sm md:text-base leading-relaxed border-l-2 border-brand-pink/20 pl-6 italic">
                {product.description}
              </p>
            </div>

            <div className="space-y-6 p-8 rounded-[2.5rem] border border-brand-dark/5 bg-white shadow-xl shadow-brand-dark/2">
              <div className="space-y-4">
                <p className="text-[10px] font-black uppercase tracking-widest text-brand-dark/30">Select Ritual Quantity</p>
                <div className="flex items-center bg-brand-beige/20 border border-brand-dark/5 rounded-2xl px-2 h-16 w-full sm:w-40">
                  <button onClick={() => setQuantity(Math.max(1, quantity - 1))} className="w-12 flex items-center justify-center text-brand-dark/40"><Minus size={16} /></button>
                  <span className="flex-1 text-center font-serif text-xl font-bold text-brand-dark">{quantity}</span>
                  <button onClick={() => setQuantity(quantity + 1)} className="w-12 flex items-center justify-center text-brand-dark/40"><Plus size={16} /></button>
                </div>
              </div>
              <div className="grid grid-cols-1 gap-4">
                <Button 
                  onClick={handleAddToCart}
                  variant="primary" 
                  className={`w-full h-16 rounded-2xl text-[11px] font-black uppercase tracking-[0.2em] shadow-2xl transition-all duration-500 ${isAdded ? 'bg-green-500 border-green-500' : 'bg-brand-dark hover:bg-brand-pink'}`}
                >
                  <ShoppingBag size={18} />
                  {isAdded ? "Added to Ritual" : "Add to Bag"}
                </Button>
                <button 
                  onClick={handleBuyNow}
                  className="w-full h-16 rounded-2xl bg-brand-pink text-white text-[11px] font-black uppercase tracking-[0.2em] shadow-xl shadow-brand-pink/20 hover:bg-brand-dark transition-all duration-500 flex items-center justify-center gap-3 active:scale-95"
                >
                  <Zap size={18} className="fill-white" />
                  Buy It Now
                </button>
              </div>
            </div>
          </div>
        </div>

        {/* ══════ SECTION: CLINICAL SCIENCE ══════ */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-12 mb-32">
          {liveHighlights.map((item, i) => (
            <div key={i} className="bg-white p-10 rounded-[2.5rem] border border-brand-dark/3 text-center space-y-4 hover:-translate-y-2 transition-transform duration-500 shadow-sm hover:shadow-xl">
              <h3 className="font-serif text-5xl font-bold text-brand-pink leading-none">{item.stat}</h3>
              <p className="text-[10px] font-black uppercase tracking-[0.2em] text-brand-dark/60 leading-relaxed">{item.text}</p>
            </div>
          ))}
        </div>

        {/* ══════ SECTION: INGREDIENTS & USAGE ══════ */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-12 mb-32">
          <div className="bg-brand-dark text-white p-12 rounded-[3.5rem] relative overflow-hidden group">
            <FlaskConical className="absolute top-10 right-10 text-white/5 w-40 h-40 group-hover:scale-110 transition-transform duration-1000" />
            <h3 className="font-serif text-4xl font-bold mb-10 relative z-10">The Molecule <br /><span className="text-brand-pink italic">Breakdown.</span></h3>
            <div className="grid grid-cols-2 gap-8 relative z-10">
              {product.ingredients.map((ing, i) => (
                <div key={i} className="space-y-2 group/ing">
                  <div className="flex items-center gap-3">
                    <CheckCircle2 size={16} className="text-brand-pink group-hover/ing:scale-110 transition-transform" />
                    <span className="text-[11px] font-black uppercase tracking-widest">{ing}</span>
                  </div>
                  <p className="text-[10px] text-white/40 leading-relaxed ml-7">Formulated for maximum bioavailability and absorption.</p>
                </div>
              ))}
            </div>
          </div>

          <div className="bg-white p-12 rounded-[3.5rem] border border-brand-dark/5">
            <div className="flex items-center gap-4 mb-10">
              <div className="w-12 h-12 rounded-full bg-brand-pink/10 flex items-center justify-center text-brand-pink"><Droplets size={24} /></div>
              <h3 className="font-serif text-4xl font-bold text-brand-dark">The <br /><span className="text-brand-pink italic">Ritual.</span></h3>
            </div>
            <div className="space-y-8">
              {[
                { title: "Cleanse", desc: "Start with a clean canvas using our gentle cleanser." },
                { title: "Apply", desc: `Gently press 3-5 drops of ${product.name} into skin.` },
                { title: "Seal", desc: "Lock in the actives with your favorite moisturizer." }
              ].map((step, i) => (
                <div key={i} className="flex gap-6 items-start group">
                  <span className="font-serif text-3xl font-bold text-brand-pink/30 group-hover:text-brand-pink transition-colors">0{i+1}</span>
                  <div className="pt-2">
                    <p className="text-sm font-bold text-brand-dark mb-1 tracking-tight">{step.title}</p>
                    <p className="text-[10px] text-brand-dark/40 uppercase font-black tracking-widest">{step.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* ══════ SECTION: REVIEWS ══════ */}
        <div id="reviews-section" className="mb-32 grid grid-cols-1 lg:grid-cols-12 gap-16">
          <div className="lg:col-span-4 space-y-10">
            <div>
              <h3 className="font-serif text-4xl font-bold text-brand-dark mb-6">Customer <span className="text-brand-pink italic">Ratings.</span></h3>
              <div className="flex items-center gap-6 mb-8">
                <span className="text-6xl font-serif font-bold text-brand-dark">{product.rating}</span>
                <div>
                  <div className="flex gap-1 text-brand-pink mb-1">
                    {[...Array(5)].map((_, i) => <Star key={i} size={16} fill="currentColor" />)}
                  </div>
                  <p className="text-[10px] font-black uppercase tracking-widest text-brand-dark/40">Out of 5 Stars</p>
                </div>
              </div>
              <div className="space-y-4">
                {[5, 4, 3, 2, 1].map((star) => (
                  <div 
                    key={star} 
                    onClick={() => setReviewFilter(reviewFilter === String(star) ? "All" : String(star))}
                    className={`flex items-center gap-4 group cursor-pointer p-2 rounded-xl transition-all ${reviewFilter === String(star) ? 'bg-brand-pink/5' : 'hover:bg-brand-dark/5'}`}
                  >
                    <span className="text-[10px] font-bold text-brand-dark w-12">{star} Star</span>
                    <div className="flex-1 h-2.5 bg-brand-dark/5 rounded-full overflow-hidden">
                      <div className="h-full bg-brand-pink transition-all" style={{ width: `${star === 5 ? 85 : star === 4 ? 10 : 2}%` }} />
                    </div>
                  </div>
                ))}
              </div>
            </div>
            <div className="p-8 bg-white rounded-3xl border border-brand-dark/5 space-y-6 shadow-xl shadow-brand-dark/2">
              <h4 className="font-serif text-xl font-bold text-brand-dark">Review this ritual</h4>
              <p className="text-xs text-brand-dark/40 leading-relaxed">Share your skin journey with others. Your feedback helps our community thrive.</p>
              <button 
                onClick={() => setIsReviewModalOpen(true)}
                className="w-full py-4 rounded-xl border border-brand-dark/10 text-[10px] font-black uppercase tracking-widest hover:bg-brand-dark hover:text-white transition-all"
              >
                Write a Review
              </button>
            </div>
          </div>

          <div className="lg:col-span-8 space-y-8">
            <div className="flex justify-between items-center mb-6">
              <h4 className="text-[10px] font-black uppercase tracking-widest text-brand-dark/30">Showing {filteredReviews.length} Ritual Stories</h4>
            </div>
            
            {reviewsLoading ? (
              <div className="py-20 text-center border-2 border-dashed border-brand-dark/5 rounded-[3rem]">
                <p className="text-[10px] font-black uppercase tracking-widest text-brand-dark/20">Loading live reviews...</p>
              </div>
            ) : filteredReviews.length === 0 ? (
              <div className="py-20 text-center border-2 border-dashed border-brand-dark/5 rounded-[3rem]">
                <p className="text-[10px] font-black uppercase tracking-widest text-brand-dark/20">No reviews matching this rating.</p>
              </div>
            ) : (
              <div className="space-y-8">
                {filteredReviews.map((rev) => (
                  <div 
                    key={rev._id || rev.id} 
                    onClick={() => setSelectedReview(rev)}
                    className="bg-white p-10 rounded-[3rem] border border-brand-dark/3 shadow-sm hover:shadow-xl transition-all duration-500 cursor-pointer group"
                  >
                    <div className="flex items-center gap-4 mb-6">
                      <div className="w-12 h-12 rounded-full bg-brand-beige flex items-center justify-center text-brand-dark/40"><User size={18} /></div>
                      <div>
                        <p className="text-xs font-black uppercase tracking-widest text-brand-dark">{rev.name}</p>
                        <div className="flex items-center gap-2">
                          <div className="flex gap-0.5 text-brand-pink">
                            {[...Array(5)].map((_, j) => <Star key={j} size={10} fill={j < rev.rating ? "currentColor" : "none"} />)}
                          </div>
                          <span className="text-[10px] font-black uppercase text-green-500 tracking-tighter">Live Review</span>
                        </div>
                      </div>
                    </div>
                    <p className="text-sm text-brand-dark/60 leading-relaxed italic mb-4 line-clamp-3">"{rev.comment}"</p>
                    <div className="flex items-center gap-6 pt-4 border-t border-brand-dark/5 text-[9px] font-black uppercase tracking-[0.2em] text-brand-dark/20">
                      <span 
                        onClick={(e) => { e.stopPropagation(); toggleHelpful(rev._id || rev.id); }}
                        className={`flex items-center gap-2 cursor-pointer transition-colors ${helpfulVotes[rev._id || rev.id] ? 'text-brand-pink font-bold' : 'hover:text-brand-pink'}`}
                      >
                        <Sparkles size={12} /> {helpfulVotes[rev._id || rev.id] ? 'Helpful' : 'Mark Helpful'}
                      </span>
                      <span onClick={(e) => { e.stopPropagation(); alert("Report submitted."); }} className="hover:text-red-500 transition-colors ml-auto">Report</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* ══════ AMAZON-STYLE: PRODUCTS RELATED TO REVIEWS (FULL WIDTH GRID) ══════ */}
        <div className="pt-16 border-t border-brand-dark/5 mb-32">
          <div className="mb-10">
            <h4 className="font-serif text-3xl font-bold text-brand-dark mb-2">Customers also <span className="text-brand-pink italic">Viewed.</span></h4>
            <p className="text-[9px] font-black uppercase tracking-widest text-brand-dark/30">Based on your clinical interest.</p>
          </div>
          
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {allOtherProducts.map((p) => (
              <div key={p.id} className="group/mini">
                <Link href={`/shop/${p.id}`} className="block">
                  <div className="relative aspect-square rounded-3xl overflow-hidden bg-white mb-4 border border-brand-dark/3 shadow-sm group-hover/mini:shadow-xl transition-all duration-500">
                    <ProductImage
                      src={p.image}
                      alt={p.name}
                      className="w-full h-full object-cover transition-transform duration-700 group-hover/mini:scale-110 mix-blend-multiply"
                      iconSize={28}
                    />
                  </div>
                  <h5 className="text-[11px] font-bold text-brand-dark group-hover/mini:text-brand-pink transition-colors leading-tight mb-1 truncate">{p.name}</h5>
                  <div className="flex flex-col gap-1">
                    <div className="flex items-center gap-1">
                      <div className="flex gap-0.5 text-brand-pink">
                        {[...Array(5)].map((_, i) => <Star key={i} size={10} fill="currentColor" />)}
                      </div>
                      <span className="text-[9px] font-black text-brand-dark/40">{Math.floor(Math.random() * 500) + 100}</span>
                    </div>
                    <p className="text-[10px] font-black text-brand-pink uppercase tracking-widest">₹{p.price}</p>
                  </div>
                </Link>
              </div>
            ))}
          </div>
        </div>

        {/* Custom Scrollbar Styling */}
        <style jsx global>{`
          .no-scrollbar::-webkit-scrollbar {
            display: none;
          }
          .no-scrollbar {
            -ms-overflow-style: none;
            scrollbar-width: none;
          }
        `}</style>
      </div>
    </div>
  );
}
