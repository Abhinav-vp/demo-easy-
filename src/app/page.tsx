'use client'

import React, { useState, useEffect, useRef } from "react";
import Image from "next/image";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import { Fire, Star, Warning, CheckCircle, House, X } from "@phosphor-icons/react";
import { MENU_ITEMS, INITIAL_REVIEWS, BUSINESS_PROFILE, MenuItem, Offer, getMenuItems, getActiveOffers, getEffectivePrice, saveEnquiry, generateOrderId, formatWhatsAppOrderMessage } from "@/lib/restaurant-data";
import { submitOrderAction } from "@/app/actions/order-actions";
import { fetchMenuItemsAction, fetchOffersAction } from "@/app/actions/admin-actions";
import RestaurantProfile from "@/components/RestaurantProfile";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

interface CartItem {
  dish: MenuItem;
  quantity: number;
}

export default function Home() {
  const [activeCategory, setActiveCategory] = useState<string>("all");
  const [cart, setCart] = useState<CartItem[]>([]);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [menuItems, setMenuItems] = useState<MenuItem[]>(() => getMenuItems());
  const [offers, setOffers] = useState<Offer[]>(() => getActiveOffers());

  // Subtle Scroll Animation Refs
  const heroRef = useRef<HTMLElement>(null);
  const heroTextRef = useRef<HTMLDivElement>(null);
  const heroOfferImgRef = useRef<HTMLDivElement>(null);
  const heroGlowRef = useRef<HTMLDivElement>(null);
  const menuSectionRef = useRef<HTMLElement>(null);
  const reviewsSectionRef = useRef<HTMLElement>(null);

  // Checkout Modal State
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [branchTouched, setBranchTouched] = useState<boolean>(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryLandmark, setDeliveryLandmark] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [isOrdering, setIsOrdering] = useState(false);
  const [orderPlaced, setOrderPlaced] = useState(false);
  const [lastPlacedOrderId, setLastPlacedOrderId] = useState("");
  const [lastPlacedOrderBranch, setLastPlacedOrderBranch] = useState("");
  const [orderError, setOrderError] = useState("");

  // Load menu items and offers from Supabase
  useEffect(() => {
    let isMounted = true;
    async function loadFromSupabase() {
      try {
        const [menuRes, offersRes] = await Promise.all([
          fetchMenuItemsAction(),
          fetchOffersAction(),
        ]);
        if (!isMounted) return;
        if (menuRes.success && menuRes.data && menuRes.data.length > 0) {
          setMenuItems(menuRes.data);
        }
        if (offersRes.success && offersRes.data) {
          setOffers(offersRes.data.filter(o => o.active));
        }
      } catch (err) {
        console.warn("Supabase fetch fallback:", err);
      }
    }

    loadFromSupabase();

    // Listen for product updates from admin
    const onUpdate = () => {
      loadFromSupabase();
    };
    window.addEventListener('orderflow_products_updated', onUpdate);
    return () => {
      isMounted = false;
      window.removeEventListener('orderflow_products_updated', onUpdate);
    };
  }, []);

  const handleAddToCart = (dish: MenuItem) => {
    const existing = cart.find(item => item.dish.id === dish.id);
    if (existing) {
      setCart(cart.map(item => item.dish.id === dish.id ? { ...item, quantity: item.quantity + 1 } : item));
    } else {
      setCart([...cart, { dish, quantity: 1 }]);
    }
    setIsCartOpen(true);
  };

  const handleUpdateQty = (dishId: string, delta: number) => {
    const updated = cart.map(item => {
      if (item.dish.id === dishId) {
        const nextQty = item.quantity + delta;
        return nextQty > 0 ? { ...item, quantity: nextQty } : null;
      }
      return item;
    }).filter(Boolean) as CartItem[];
    setCart(updated);
  };

  // Calculations
  const filteredDishes = activeCategory === "all"
    ? menuItems
    : menuItems.filter(item => item.category === activeCategory);

  const cartCount = cart.reduce((sum, item) => sum + item.quantity, 0);
  const cartSubtotal = cart.reduce((sum, item) => {
    const { price } = getEffectivePrice(item.dish, offers);
    return sum + (price * item.quantity);
  }, 0);
  const cartFinalTotal = cartSubtotal;

  // Carousel State
  const [currentOfferIndex, setCurrentOfferIndex] = useState(0);
  const [isCarouselHovered, setIsCarouselHovered] = useState(false);

  // Phone & Address Validation State
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [addressTouched, setAddressTouched] = useState(false);

  // Auto-rotate hero offers carousel
  useEffect(() => {
    if (offers.length <= 1 || isCarouselHovered) return;
    const interval = setInterval(() => {
      setCurrentOfferIndex(prev => (prev + 1) % offers.length);
    }, 4000);
    return () => clearInterval(interval);
  }, [offers.length, isCarouselHovered]);

  // Subtle Bidirectional Scroll Animations
  useEffect(() => {
    const isReduced = typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (isReduced) return;

    const ctx = gsap.context(() => {
      // 1. Hero Section Subtle Scroll Parallax & Scale
      if (heroRef.current) {
        if (heroTextRef.current) {
          gsap.to(heroTextRef.current, {
            y: -35,
            opacity: 0.25,
            ease: 'none',
            scrollTrigger: {
              trigger: heroRef.current,
              start: 'top top',
              end: 'bottom 25%',
              scrub: 0.5,
            },
          });
        }

        if (heroOfferImgRef.current) {
          gsap.to(heroOfferImgRef.current, {
            scale: 1.06,
            ease: 'none',
            scrollTrigger: {
              trigger: heroRef.current,
              start: 'top top',
              end: 'bottom 20%',
              scrub: 0.5,
            },
          });
        }

        if (heroGlowRef.current) {
          gsap.to(heroGlowRef.current, {
            y: 60,
            opacity: 0.3,
            ease: 'none',
            scrollTrigger: {
              trigger: heroRef.current,
              start: 'top top',
              end: 'bottom top',
              scrub: true,
            },
          });
        }
      }

      // 2. Menu Section Header Reveal (Bidirectional: play reverse play reverse)
      if (menuSectionRef.current) {
        gsap.fromTo(
          '.section-header-reveal',
          { opacity: 0, y: 25 },
          {
            opacity: 1,
            y: 0,
            duration: 0.7,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: menuSectionRef.current,
              start: 'top 85%',
              toggleActions: 'play reverse play reverse',
            },
          }
        );

        // 3. Existing Food Cards Reveal (Bidirectional)
        gsap.fromTo(
          '.food-card-reveal',
          { opacity: 0, y: 20, scale: 0.96 },
          {
            opacity: 1,
            y: 0,
            scale: 1,
            duration: 0.6,
            stagger: 0.07,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: menuSectionRef.current,
              start: 'top 75%',
              toggleActions: 'play reverse play reverse',
            },
          }
        );

        // 4. Food Image Subtle Parallax
        gsap.utils.toArray<HTMLElement>('.food-img-parallax').forEach((imgEl) => {
          gsap.fromTo(
            imgEl,
            { yPercent: -5 },
            {
              yPercent: 5,
              ease: 'none',
              scrollTrigger: {
                trigger: imgEl.closest('.food-card-reveal') || imgEl,
                start: 'top bottom',
                end: 'bottom top',
                scrub: 0.5,
              },
            }
          );
        });
      }

      // 5. Reviews Section Reveal (Bidirectional)
      if (reviewsSectionRef.current) {
        gsap.fromTo(
          '.review-card-reveal',
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.5,
            stagger: 0.08,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: reviewsSectionRef.current,
              start: 'top 80%',
              toggleActions: 'play reverse play reverse',
            },
          }
        );

        gsap.fromTo(
          '#location',
          { opacity: 0, y: 20 },
          {
            opacity: 1,
            y: 0,
            duration: 0.6,
            ease: 'power2.out',
            scrollTrigger: {
              trigger: '#location',
              start: 'top 85%',
              toggleActions: 'play reverse play reverse',
            },
          }
        );
      }
    });

    return () => ctx.revert();
  }, [filteredDishes]);

  // Phone Validation Helper
  const validatePhone = (phone: string): { isValid: boolean; message: string } => {
    const clean = phone.replace(/[\s-]/g, '');
    if (!clean) return { isValid: false, message: "Phone number is required" };
    const indianMobileRegex = /^(?:\+?91)?[6-9]\d{9}$/;
    if (!indianMobileRegex.test(clean)) {
      return { isValid: false, message: "Please enter a valid 10-digit mobile number (e.g., 9876543210)" };
    }
    return { isValid: true, message: "" };
  };

  // Address Validation Helper
  const validateAddress = (address: string): { isValid: boolean; message: string } => {
    if (!address || address.trim().length < 5) {
      return { isValid: false, message: "Please enter a complete home delivery address (min 5 characters)" };
    }
    return { isValid: true, message: "" };
  };

  const handlePlaceOrder = async (e: React.FormEvent) => {
    e.preventDefault();
    if (cart.length === 0) return;

    if (!selectedBranch) {
      setBranchTouched(true);
      setOrderError("Please select a branch (Kariyad or Pallikkuni) to proceed.");
      return;
    }

    const phoneVal = validatePhone(customerPhone);
    if (!phoneVal.isValid) {
      setPhoneTouched(true);
      setOrderError(phoneVal.message);
      return;
    }

    const addrVal = validateAddress(deliveryAddress);
    if (!addrVal.isValid) {
      setAddressTouched(true);
      setOrderError(addrVal.message);
      return;
    }

    setIsOrdering(true);
    setOrderError("");

    const orderId = generateOrderId();
    setLastPlacedOrderId(orderId);
    setLastPlacedOrderBranch(selectedBranch);

    const itemListString = cart.map(item => `${item.quantity}x ${item.dish.name}`).join(", ");
    const totalQuantity = cart.reduce((sum, item) => sum + item.quantity, 0);
    const fullItemsDescription = itemListString;

    const itemDetails = cart.map(item => {
      const priceInfo = getEffectivePrice(item.dish, offers);
      return {
        name: item.dish.name,
        quantity: item.quantity,
        unitPrice: priceInfo.price,
        lineTotal: parseFloat((priceInfo.price * item.quantity).toFixed(2)),
      };
    });

    try {
      const orderData = {
        id: `enq-${orderId}`,
        orderId,
        status: 'pending' as const,
        branch: selectedBranch,
        customerName,
        customerPhone,
        deliveryAddress: deliveryAddress.trim(),
        deliveryLandmark: deliveryLandmark.trim() || undefined,
        deliveryNotes: deliveryNotes.trim() || undefined,
        items: fullItemsDescription,
        itemDetails,
        subtotalPrice: parseFloat(cartSubtotal.toFixed(2)),
        totalQuantity,
        totalPrice: parseFloat(cartFinalTotal.toFixed(2)),
        createdAt: new Date().toISOString(),
      };

      // Save enquiry directly into Supabase
      submitOrderAction(orderData).catch(err => {
        console.error("Supabase order submission error:", err);
      });

      // Keep local backup
      saveEnquiry(orderData);

      // Open WhatsApp with formatted message
      try {
        const whatsappNumber = "918113021038";
        const formattedMessage = formatWhatsAppOrderMessage({
          orderId,
          branch: selectedBranch,
          customerName,
          customerPhone,
          deliveryAddress: deliveryAddress.trim(),
          deliveryLandmark: deliveryLandmark.trim() || undefined,
          deliveryNotes: deliveryNotes.trim() || undefined,
          cartItems: itemDetails.map(i => ({ name: i.name, quantity: i.quantity, unitPrice: i.unitPrice })),
          subtotal: cartSubtotal,
          finalTotal: cartFinalTotal
        });
        const waUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(formattedMessage)}`;
        window.open(waUrl, "_blank");
      } catch (waErr) {
        console.warn("WhatsApp redirect failed", waErr);
      }

      setOrderPlaced(true);
      setCart([]);
      setSelectedBranch("");
      setBranchTouched(false);
      setCustomerName("");
      setCustomerPhone("");
      setDeliveryAddress("");
      setDeliveryLandmark("");
      setDeliveryNotes("");
      setPhoneTouched(false);
      setAddressTouched(false);
      setIsCartOpen(false);
      setIsCheckoutOpen(false);
    } catch (err: unknown) {
      console.error(err);
      setOrderError((err as Error)?.message || "Failed to place order. Please try again.");
    } finally {
      setIsOrdering(false);
    }
  };

  return (
    <div className="min-h-screen flex flex-col text-slate-100 relative selection:bg-amber-500 selection:text-slate-950 font-sans">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-4 py-3.5 md:px-12 md:py-4 glass-light sticky top-0 z-40 backdrop-blur-xl border-b border-amber-500/10">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl overflow-hidden shadow-lg shadow-emerald-500/20 border border-emerald-500/30 flex-shrink-0 bg-slate-900 flex items-center justify-center relative">
            <Image src="/easy_mart_hero.jpg" alt="Easy Mart Logo" fill className="object-cover" />
          </div>
          <div className="flex flex-col text-left">
            <span className="text-base md:text-lg font-black tracking-tight text-white leading-none font-heading">EASY MART SUPERMARKET</span>
            <span className="text-[10px] uppercase font-extrabold tracking-widest text-emerald-400 mt-0.5">Pallikkuni • Fresh Groceries</span>
          </div>
        </div>

        <div className="hidden md:flex items-center gap-8 text-xs font-bold uppercase tracking-widest text-slate-300">
          <a href="#groceries" className="hover:text-emerald-400 transition-smooth">Groceries</a>
          <a href="#reviews" className="hover:text-emerald-400 transition-smooth">Reviews</a>
          <a href="#location" className="hover:text-emerald-400 transition-smooth">Location</a>
          <span className="w-[1px] h-4 bg-slate-800"></span>
        </div>

        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCartOpen(true)}
            className="relative p-3 rounded-2xl glass hover:border-amber-500/40 hover:bg-slate-800/80 transition-smooth shadow-lg"
            aria-label="Toggle Shopping Cart"
          >
            <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-gradient-to-r from-red-600 to-amber-500 text-[10px] font-black text-white flex items-center justify-center shadow-lg animate-bounce">
                {cartCount}
              </span>
            )}
          </button>
        </div>
      </nav>

      {/* Hero Section */}
      <header ref={heroRef} className="relative flex-1 flex flex-col items-center justify-center px-4 py-14 md:px-6 md:py-24 text-center overflow-hidden">
        {/* Ambient Dark Gourmet Spotlights */}
        <div ref={heroGlowRef} className="absolute inset-0 z-0 pointer-events-none">
          <div className="absolute top-1/3 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-amber-500/10 rounded-full blur-[140px]" />
          <div className="absolute bottom-10 left-1/4 w-[400px] h-[400px] bg-red-600/8 rounded-full blur-[120px]" />
          <div className="absolute top-20 right-1/4 w-[350px] h-[350px] bg-yellow-500/8 rounded-full blur-[100px]" />
        </div>

        <div className="max-w-4xl mx-auto z-10 flex flex-col items-center">
          {/* Hero Section Offer Highlight Carousel */}
          {offers.length > 0 && (
            <div
              className="w-full max-w-3xl mb-10 relative rounded-3xl overflow-hidden glass-card p-5 md:p-6 shadow-2xl transition-all duration-500 border border-amber-500/25"
              onMouseEnter={() => setIsCarouselHovered(true)}
              onMouseLeave={() => setIsCarouselHovered(false)}
            >
              {(() => {
                const offer = offers[currentOfferIndex] || offers[0];
                const matchedDish = offer.applicableProducts && offer.applicableProducts.length > 0
                  ? menuItems.find(item => offer.applicableProducts.includes(item.id))
                  : menuItems[0];
                const imageSrc = matchedDish?.image || "/easy_mart_hero.jpg";

                return (
                  <div key={offer.id} className="flex flex-col sm:flex-row items-center gap-5 md:gap-7 animate-fadeIn text-left">
                    {/* Product Image preview */}
                    <div ref={heroOfferImgRef} className="w-full sm:w-40 md:w-48 h-36 sm:h-36 md:h-40 relative rounded-2xl overflow-hidden bg-slate-950 shrink-0 border border-amber-500/20 shadow-xl group">
                      {imageSrc.startsWith("/") ? (
                        <Image src={imageSrc} alt={offer.title} fill className="object-cover group-hover:scale-105 transition-smooth duration-500" />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={imageSrc} alt={offer.title} className="w-full h-full object-cover group-hover:scale-105 transition-smooth duration-500" />
                      )}
                      <span className="absolute top-2.5 left-2.5 badge-crimson shadow-lg">
                        HOT DEAL
                      </span>
                    </div>

                    {/* Offer text info */}
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-2 flex-wrap">
                        <span className="badge-amber flex items-center gap-1">
                          <Fire className="w-3.5 h-3.5 text-amber-400" weight="fill" /> 
                          {offer.discountType === 'percentage' ? `${offer.discountValue}% OFF` : `₹${offer.discountValue} OFF`}
                        </span>
                        <span className="text-[10px] text-slate-400 uppercase tracking-widest font-extrabold">
                          {matchedDish ? matchedDish.name : 'Special Deal'}
                        </span>
                      </div>
                      <h3 className="text-xl md:text-2xl font-black text-white leading-tight mb-1.5 font-heading">{offer.title}</h3>
                      <p className="text-xs md:text-sm text-slate-300 line-clamp-2 leading-relaxed">{offer.description || "Limited time deal on authentic restaurant delicacies."}</p>

                      <div className="mt-4 flex items-center justify-between">
                        <a href="#menu" className="text-xs font-black text-amber-400 hover:text-amber-300 flex items-center gap-1.5 uppercase tracking-wider group">
                          Order Deal Now
                          <svg className="w-4 h-4 group-hover:translate-x-1 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3" />
                          </svg>
                        </a>
                        {offers.length > 1 && (
                          <span className="text-[11px] text-amber-500/80 font-mono font-bold bg-amber-500/10 px-2.5 py-0.5 rounded-full border border-amber-500/20">
                            {currentOfferIndex + 1} / {offers.length}
                          </span>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })()}

              {/* Carousel Pagination Dots & Controls */}
              {offers.length > 1 && (
                <div className="flex items-center justify-center gap-2 mt-4 pt-3 border-t border-slate-800/80">
                  <button
                    onClick={() => setCurrentOfferIndex(prev => (prev - 1 + offers.length) % offers.length)}
                    className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-smooth mr-2"
                    aria-label="Previous Offer"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M15.75 19.5L8.25 12l7.5-7.5" /></svg>
                  </button>

                  {offers.map((_, idx) => (
                    <button
                      key={idx}
                      onClick={() => setCurrentOfferIndex(idx)}
                      className={`h-1.5 rounded-full transition-all duration-300 ${currentOfferIndex === idx ? 'w-7 bg-amber-400 shadow-md shadow-amber-400/50' : 'w-1.5 bg-slate-800 hover:bg-slate-600'
                        }`}
                      aria-label={`Go to slide ${idx + 1}`}
                    />
                  ))}

                  <button
                    onClick={() => setCurrentOfferIndex(prev => (prev + 1) % offers.length)}
                    className="p-1.5 rounded-full text-slate-400 hover:text-white hover:bg-slate-800 transition-smooth ml-2"
                    aria-label="Next Offer"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M8.25 4.5l7.5 7.5-7.5 7.5" /></svg>
                  </button>
                </div>
              )}
            </div>
          )}

          <div ref={heroTextRef} className="flex flex-col items-center">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-black uppercase tracking-wider mb-4 shadow-lg">
              <span>🛒</span>
              <span>Express 30-Min Delivery in Pallikkuni</span>
            </div>
            <h1 className="text-4xl sm:text-5xl md:text-7xl font-black text-white mb-4 md:mb-6 tracking-tight leading-tight slide-up font-heading">
              Fresh Groceries & <br className="hidden md:inline" />
              <span className="text-transparent bg-clip-text bg-gradient-to-r from-emerald-400 via-teal-200 to-amber-300">
                Daily Essentials
              </span>
            </h1>

            <p className="text-sm md:text-lg text-slate-300 max-w-2xl mx-auto mb-9 md:mb-11 fade-in px-2 leading-relaxed font-light">
              Farm-fresh vegetables, seasonal fruits, dairy, rice, spices, and everyday household necessities delivered directly to your doorstep in Pallikkuni.
            </p>

            <div className="flex flex-wrap items-center justify-center gap-4 fade-in">
              <a href="#groceries" className="btn-primary text-sm px-8 py-4 uppercase tracking-wider">
                Browse Supermarket
              </a>
              <a href="#location" className="btn-secondary text-sm px-8 py-4 uppercase tracking-wider">
                Store Location & Hours
              </a>
            </div>
          </div>

          {/* Quick Info Grid - Gourmet Dark Glass Cards */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 md:gap-5 w-full max-w-6xl mt-14 md:mt-20 text-left">
            {[
              {
                title: "Opening Hours",
                desc: "8:00 AM – 10:00 PM",
                sub: "Monday – Sunday",
                badge: "Open Daily",
                badgeBg: "badge-emerald",
                gradient: "from-emerald-500/20 to-teal-500/20",
                icon: (
                  <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                ),
                href: undefined,
              },
              {
                title: "Delivery Order Line",
                desc: "+91 81130 21038",
                sub: "WhatsApp delivery in Pallikkuni",
                badge: "WhatsApp / Call",
                badgeBg: "badge-amber",
                gradient: "from-emerald-500/20 to-amber-500/20",
                icon: (
                  <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M3 5a2 2 0 012-2h3.28a1 1 0 01.94.725l.548 2.2a1 1 0 01-.321.988l-1.305.98a10.582 10.582 0 004.872 4.872l.98-1.305a1 1 0 01.988-.321l2.2.548a1 1 0 01.725.94V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                  </svg>
                ),
                href: "tel:+918113021038",
              },
              {
                title: "Supermarket Address",
                desc: "Pallikkuni, Peringathur",
                sub: "Kerala, India 670675",
                badge: "Google Map",
                badgeBg: "px-3 py-1 rounded-full bg-sky-500/20 text-sky-400 border border-sky-500/30 text-[11px] font-extrabold uppercase tracking-wider",
                gradient: "from-sky-500/20 to-emerald-500/20",
                icon: (
                  <svg className="w-5 h-5 text-sky-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                  </svg>
                ),
                href: "#location",
              },
              {
                title: "Doorstep Delivery",
                desc: "Home Delivery",
                sub: "Pallikkuni & nearby areas",
                badge: "Express 30m",
                badgeBg: "badge-crimson",
                gradient: "from-emerald-500/20 to-teal-500/20",
                icon: (
                  <svg className="w-5 h-5 text-emerald-400" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
                  </svg>
                ),
                href: "#groceries",
              }
            ].map((info, idx) => {
              const CardContent = (
                <div className="glass-card rounded-3xl p-5 hover:-translate-y-1 transition-smooth flex flex-col justify-between h-full border border-slate-800/90 hover:border-emerald-500/40">
                  <div className="flex items-start justify-between gap-3 mb-4">
                    <div className={`w-11 h-11 rounded-2xl bg-gradient-to-br ${info.gradient} flex items-center justify-center shrink-0 border border-slate-700/60 shadow-inner`}>
                      {info.icon}
                    </div>
                    <span className={info.badgeBg}>
                      {info.badge}
                    </span>
                  </div>

                  <div>
                    <h4 className="text-[10px] font-extrabold text-emerald-400 uppercase tracking-widest leading-none mb-1.5">
                      {info.title}
                    </h4>
                    <p className="text-base font-black text-white font-heading leading-tight">
                      {info.desc}
                    </p>
                    <p className="text-xs text-slate-400 mt-1 font-medium">{info.sub}</p>
                  </div>
                </div>
              );

              return info.href ? (
                <a key={idx} href={info.href} className="block h-full">
                  {CardContent}
                </a>
              ) : (
                <div key={idx} className="h-full">
                  {CardContent}
                </div>
              );
            })}
          </div>
        </div>
      </header>

      {/* Menu Section */}
      {/* Supermarket Groceries Section */}
      <section ref={menuSectionRef} id="groceries" className="py-16 md:py-24 px-4 md:px-12 relative z-10 border-t border-slate-800/60">
        <div className="max-w-7xl mx-auto">
          {/* Header */}
          <div className="section-header-reveal flex flex-col md:flex-row md:items-end justify-between gap-4 md:gap-6 mb-10 md:mb-14">
            <div className="text-left">
              <span className="badge-emerald mb-2 inline-block">Fresh Daily Arrivals</span>
              <h2 className="text-3xl md:text-4xl font-black text-white font-heading">Supermarket Departments</h2>
              <p className="text-sm text-slate-400 mt-2 font-light">Farm fresh vegetables, dairy, pantry staples, and daily home essentials at direct supermarket prices.</p>
            </div>
            {/* Filters */}
            <div className="flex items-center gap-2.5 overflow-x-auto pb-2 scrollbar-none">
              {[
                { id: "all", label: "All Items" },
                { id: "fruits-vegetables", label: "🥦 Fruits & Veggies" },
                { id: "dairy-bakery", label: "🥛 Dairy & Bread" },
                { id: "groceries-staples", label: "🌾 Rice & Staples" },
                { id: "snacks-beverages", label: "🍪 Snacks & Drinks" },
                { id: "household-essentials", label: "🧼 Home Essentials" }
              ].map((category) => (
                <button
                  key={category.id}
                  onClick={() => setActiveCategory(category.id)}
                  className={`px-4 py-2.5 rounded-2xl text-xs font-black whitespace-nowrap transition-smooth uppercase tracking-wider border ${activeCategory === category.id
                      ? "bg-gradient-to-r from-emerald-600 to-teal-500 text-white border-emerald-400/50 shadow-lg shadow-emerald-500/25"
                      : "glass text-slate-300 hover:text-white hover:border-emerald-500/30"
                    }`}
                >
                  {category.label}
                </button>
              ))}
            </div>
          </div>

          {/* Menu Grid */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-5 md:gap-7">
            {filteredDishes.map((dish) => {
              const priceInfo = getEffectivePrice(dish, offers);
              return (
                <div
                  key={dish.id}
                  className="food-card-reveal glass-card rounded-3xl overflow-hidden hover:scale-[1.02] transition-smooth group flex flex-col border border-slate-800/80 hover:border-emerald-500/40 shadow-2xl"
                >
                  {/* Image Container */}
                  <div className="h-48 md:h-56 relative w-full overflow-hidden bg-slate-950 flex items-center justify-center border-b border-slate-800/60">
                    {dish.image ? (
                      dish.image.startsWith("/") ? (
                        <Image
                          src={dish.image}
                          alt={dish.name}
                          fill
                          className="food-img-parallax object-cover group-hover:scale-105 transition-smooth duration-500 scale-105"
                        />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={dish.image} alt={dish.name} className="food-img-parallax w-full h-full object-cover group-hover:scale-105 transition-smooth duration-500 scale-105" />
                      )
                    ) : (
                      <div className="absolute inset-0 bg-gradient-to-tr from-slate-950 via-slate-900 to-slate-950 flex items-center justify-center p-6 text-center">
                        <div className="w-14 h-14 rounded-2xl bg-emerald-500/10 flex items-center justify-center text-emerald-400 mb-2 border border-emerald-500/20 shadow-inner">
                          <svg className="w-7 h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                            <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                          </svg>
                        </div>
                        <span className="text-[10px] text-emerald-400/80 uppercase tracking-widest font-extrabold">Easy Mart Fresh</span>
                      </div>
                    )}
                    {/* Category Tag */}
                    <span className="absolute top-4 left-4 badge-amber uppercase shadow-lg">
                      {dish.category}
                    </span>
                    {/* Offer Badge */}
                    {priceInfo.offerTitle && (
                      <span className="absolute top-4 right-4 badge-crimson shadow-lg">
                        {offers.find(o => o.title === priceInfo.offerTitle)?.discountType === 'percentage'
                          ? `${offers.find(o => o.title === priceInfo.offerTitle)?.discountValue}% OFF`
                          : `₹${offers.find(o => o.title === priceInfo.offerTitle)?.discountValue} OFF`
                        }
                      </span>
                    )}
                  </div>

                  {/* Details */}
                  <div className="p-6 md:p-7 flex-1 flex flex-col justify-between text-left">
                    <div>
                      <div className="flex justify-between items-start gap-4 mb-2.5">
                        <h3 className="font-black text-white text-lg md:text-xl font-heading group-hover:text-amber-400 transition-smooth">{dish.name}</h3>
                        <div className="text-right shrink-0">
                          {priceInfo.originalPrice ? (
                            <>
                              <span className="text-slate-500 line-through text-xs mr-1.5 font-bold">₹{priceInfo.originalPrice.toFixed(2)}</span>
                              <span className="text-amber-400 font-black text-xl font-heading">₹{priceInfo.price.toFixed(2)}</span>
                            </>
                          ) : (
                            <span className="text-amber-400 font-black text-xl font-heading">₹{priceInfo.price.toFixed(2)}</span>
                          )}
                        </div>
                      </div>
                      <p className="text-slate-300 text-sm leading-relaxed mb-6 font-light line-clamp-3">{dish.description}</p>
                    </div>

                    <button
                      onClick={() => handleAddToCart(dish)}
                      className="w-full btn-primary text-xs uppercase tracking-wider py-3.5"
                    >
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                        <path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" />
                      </svg>
                      Add to Cart Basket
                    </button>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </section>

      {/* Info & Reviews Split Section */}
      <section ref={reviewsSectionRef} id="reviews" className="py-16 md:py-24 px-4 md:px-12 relative z-10 border-t border-slate-800/60">
        <div className="max-w-7xl mx-auto grid grid-cols-1 lg:grid-cols-12 gap-8 md:gap-12">
          {/* Reviews List */}
          <div className="lg:col-span-7 flex flex-col text-left">
            <div className="flex items-center justify-between gap-4 mb-8 flex-wrap">
              <div>
                <span className="badge-emerald mb-2 inline-block">Customer Feedback</span>
                <h2 className="text-3xl font-black text-white font-heading">Google Verified Reviews</h2>
                <div className="flex items-center gap-2 mt-2">
                  <span className="text-sm font-black text-emerald-400">4.8 out of 5 stars</span>
                  <div className="flex items-center text-amber-400 gap-0.5">
                    {Array.from({ length: 5 }).map((_, i) => (
                      <span key={i}><Star className="w-4 h-4" weight="fill" /></span>
                    ))}
                  </div>
                  <span className="text-xs text-slate-400 font-medium">({INITIAL_REVIEWS.length} reviews)</span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <a
                  href={BUSINESS_PROFILE.googleReviewUrl || BUSINESS_PROFILE.googleMapsUrl}
                  target="_blank"
                  rel="noreferrer"
                  className="btn-primary text-xs py-3 px-5 uppercase tracking-wider flex items-center gap-2"
                >
                  <span>Leave Google Review</span>
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M10 6H6a2 2 0 00-2 2v10a2 2 0 002 2h10a2 2 0 002-2v-4M14 4h6m0 0v6m0-6L10 14" />
                  </svg>
                </a>
              </div>
            </div>

            {/* Reviews List */}
            <div className="space-y-4 max-h-[500px] overflow-y-auto pr-2 scrollbar-none">
              {INITIAL_REVIEWS.map((rev) => (
                <div key={rev.id} className="review-card-reveal glass-card p-6 rounded-3xl border border-slate-800/80 flex flex-col gap-3">
                  <div className="flex justify-between items-center">
                    <div>
                      <span className="font-black text-base text-white font-heading">{rev.author}</span>
                      <span className="text-[10px] text-emerald-400/80 ml-2 font-bold uppercase tracking-wider">{rev.date}</span>
                    </div>
                    <div className="flex items-center text-amber-400 text-xs">
                      {Array.from({ length: 5 }).map((_, i) => (
                        <span key={i} className={i < rev.rating ? "text-amber-400" : "text-slate-800"}><Star className="w-3.5 h-3.5" weight="fill" /></span>
                      ))}
                    </div>
                  </div>
                  <p className="text-sm text-slate-300 leading-relaxed font-light">{rev.comment}</p>
                </div>
              ))}
            </div>
          </div>

          {/* Location */}
          <RestaurantProfile />
        </div>
      </section>

      {/* Footer */}
      <footer className="py-10 text-center text-slate-400 border-t border-slate-800/60 text-xs px-4">
        <p className="mb-2 font-medium">Easy Mart Supermarket &copy; {new Date().getFullYear()} – Quality Freshness Daily.</p>
        <p className="text-slate-500">Pallikkuni, Peringathur, Kerala 670675 • Delivery Phone: +91 81130 21038</p>
      </footer>


      {/* Floating Cart Button (mobile) */}
      {cartCount > 0 && !isCartOpen && !isCheckoutOpen && (
        <button
          onClick={() => setIsCartOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-gradient-to-tr from-amber-600 via-amber-500 to-yellow-500 text-slate-950 p-4 rounded-full shadow-2xl flex items-center justify-center gap-2 hover:scale-105 active:scale-95 transition-smooth font-black border border-amber-400/40 glow-amber"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          <span>Cart ({cartCount})</span>
        </button>
      )}

      {/* Cart Drawer — Only shows products + quantity */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/80 backdrop-blur-md animate-fadeIn">
          <div className="absolute inset-0 -z-10" onClick={() => setIsCartOpen(false)} />

          <div className="w-full max-w-md bg-[#0d0f14]/95 border-l border-amber-500/20 p-6 flex flex-col justify-between shadow-2xl relative animate-slideLeft h-full overflow-y-auto backdrop-blur-2xl">
            <div>
              {/* Header */}
              <div className="flex justify-between items-center border-b border-slate-800/80 pb-4 mb-6">
                <div className="flex items-center gap-2.5">
                  <h3 className="font-black text-white text-lg font-heading text-left">Your Order Basket</h3>
                  <span className="badge-amber">{cartCount} items</span>
                </div>
                <button
                  onClick={() => setIsCartOpen(false)}
                  className="p-2 text-slate-400 hover:text-white rounded-xl hover:bg-slate-800/80 transition-smooth"
                >
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              {/* Items List */}
              {cart.length === 0 ? (
                <div className="text-center py-24 text-slate-500">
                  <div className="w-16 h-16 rounded-2xl bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4 text-amber-400">
                    <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                    </svg>
                  </div>
                  <p className="text-base font-bold text-slate-300 font-heading">Your basket is empty</p>
                  <p className="text-xs mt-1 text-slate-500">Explore our chef specials and add dishes to order.</p>
                </div>
              ) : (
                <div className="space-y-4 max-h-[420px] overflow-y-auto pr-1 scrollbar-none">
                  {cart.map((item) => {
                    const priceInfo = getEffectivePrice(item.dish, offers);
                    return (
                      <div key={item.dish.id} className="flex justify-between items-center py-3.5 border-b border-slate-800/60">
                        <div className="text-left max-w-[210px]">
                          <h4 className="font-black text-sm text-white font-heading">{item.dish.name}</h4>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {priceInfo.originalPrice ? (
                              <>
                                <span className="text-[10px] text-slate-500 line-through font-bold">₹{priceInfo.originalPrice.toFixed(2)}</span>
                                <span className="text-xs text-amber-400 font-extrabold">₹{priceInfo.price.toFixed(2)}</span>
                              </>
                            ) : (
                              <span className="text-xs text-amber-400 font-extrabold">₹{priceInfo.price.toFixed(2)}</span>
                            )}
                          </div>
                        </div>

                        {/* Quantity Controls */}
                        <div className="flex items-center gap-3">
                          <button
                            onClick={() => handleUpdateQty(item.dish.id, -1)}
                            className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300 hover:bg-amber-500 hover:text-slate-950 font-black transition-smooth"
                          >
                            -
                          </button>
                          <span className="text-sm font-black text-white w-4 text-center">{item.quantity}</span>
                          <button
                            onClick={() => handleUpdateQty(item.dish.id, 1)}
                            className="w-9 h-9 rounded-xl bg-slate-900 border border-slate-800 flex items-center justify-center text-slate-300 hover:bg-amber-500 hover:text-slate-950 font-black transition-smooth"
                          >
                            +
                          </button>
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Proceed to Checkout Button */}
            {cart.length > 0 && (
              <div className="border-t border-slate-800/80 pt-4 mt-6">
                <div className="space-y-2 mb-5">
                  <div className="flex justify-between items-center text-xs text-slate-400">
                    <span>Subtotal</span>
                    <span className="font-bold">₹{cartSubtotal.toFixed(2)}</span>
                  </div>
                  <div className="flex justify-between items-center text-lg font-black text-white pt-2.5 border-t border-slate-800 font-heading">
                    <span>Total Bill</span>
                    <span className="text-amber-400">₹{cartFinalTotal.toFixed(2)}</span>
                  </div>
                </div>

                <button
                  onClick={() => { setIsCartOpen(false); setIsCheckoutOpen(true); }}
                  className="w-full btn-primary text-xs uppercase tracking-wider py-4"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                    <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                  </svg>
                  Proceed to Checkout
                </button>
              </div>
            )}
          </div>
        </div>
      )}

      {/* Checkout Modal — Name + Phone Number */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-slate-950/85 backdrop-blur-md animate-fadeIn">
          <div className="w-full max-w-lg glass-card rounded-3xl p-6 md:p-8 border border-amber-500/25 relative animate-scaleUp shadow-2xl">
            {/* Close */}
            <button
              onClick={() => setIsCheckoutOpen(false)}
              className="absolute top-4 right-4 p-2 text-slate-400 hover:text-white rounded-xl transition-smooth"
              aria-label="Close Checkout Modal"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-2xl font-black text-white mb-1 font-heading">Complete Grocery Order</h3>
            <p className="text-xs text-slate-400 mb-6">Enter details to dispatch via WhatsApp directly to Easy Mart Supermarket</p>

            {/* Order Summary */}
            <div className="glass rounded-2xl p-4 mb-6 border border-slate-800 max-h-56 overflow-y-auto">
              {cart.map(item => {
                const priceInfo = getEffectivePrice(item.dish, offers);
                return (
                  <div key={item.dish.id} className="flex justify-between items-center py-2 border-b border-slate-800/30 last:border-0">
                    <span className="text-sm text-white">{item.quantity}x {item.dish.name}</span>
                    <span className="text-sm text-amber-400 font-bold">₹{(priceInfo.price * item.quantity).toFixed(2)}</span>
                  </div>
                );
              })}
              <div className="pt-3 mt-2 border-t border-slate-700 space-y-1.5">
                <div className="flex justify-between items-center text-xs text-slate-400">
                  <span>Subtotal</span>
                  <span>₹{cartSubtotal.toFixed(2)}</span>
                </div>

                <div className="flex justify-between items-center pt-2 border-t border-slate-800">
                  <span className="text-sm font-bold text-white">Total</span>
                  <span className="text-lg font-extrabold text-amber-500">₹{cartFinalTotal.toFixed(2)}</span>
                </div>
              </div>
            </div>

            {orderError && (
              <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
                {orderError}
              </div>
            )}

            {/* Checkout Form */}
            <form onSubmit={handlePlaceOrder} className="space-y-4 text-left">
              {/* Branch Selection Field */}
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                  Select Branch *
                </label>
                <div className="relative">
                  <select
                    required
                    value={selectedBranch}
                    onChange={(e) => {
                      setSelectedBranch(e.target.value);
                      if (!branchTouched) setBranchTouched(true);
                    }}
                    onBlur={() => setBranchTouched(true)}
                    className={`w-full px-4 py-3 text-sm bg-slate-900/80 border rounded-xl text-white appearance-none cursor-pointer focus:outline-none transition-smooth ${
                      branchTouched && !selectedBranch
                        ? "border-red-500 focus:ring-red-500/50"
                        : branchTouched && selectedBranch
                        ? "border-green-500 focus:ring-green-500/50"
                        : "border-slate-800 focus:border-amber-500"
                    }`}
                  >
                    <option value="" disabled className="bg-slate-900 text-slate-500">
                      Select your branch
                    </option>
                    <option value="Kariyad" className="bg-slate-900 text-white">
                      Kariyad
                    </option>
                    <option value="Pallikkuni" className="bg-slate-900 text-white">
                      Pallikkuni
                    </option>
                  </select>
                  <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-4 text-slate-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                    </svg>
                  </div>
                </div>
                {branchTouched && !selectedBranch && (
                  <p className="text-[10px] text-red-400 mt-1 flex items-center gap-1">
                    <Warning className="w-3.5 h-3.5" /> Please select a branch to proceed
                  </p>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Your Full Name</label>
                <input
                  type="text"
                  required
                  placeholder="Enter your full name"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="px-4 py-3 text-sm"
                />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Phone Number</label>
                <input
                  type="tel"
                  required
                  placeholder="10-digit Mobile Number (e.g. 8113021038)"
                  value={customerPhone}
                  onChange={(e) => {
                    setCustomerPhone(e.target.value);
                    if (!phoneTouched) setPhoneTouched(true);
                  }}
                  onBlur={() => setPhoneTouched(true)}
                  className={`px-4 py-3 text-sm ${phoneTouched && customerPhone && !validatePhone(customerPhone).isValid
                      ? "border-red-500 focus:ring-red-500/50"
                      : phoneTouched && customerPhone && validatePhone(customerPhone).isValid
                        ? "border-green-500 focus:ring-green-500/50"
                        : ""
                    }`}
                />
                {phoneTouched && customerPhone && !validatePhone(customerPhone).isValid && (
                  <p className="text-[10px] text-red-400 mt-1 flex items-center gap-1">
                    <Warning className="w-3.5 h-3.5" /> {validatePhone(customerPhone).message}
                  </p>
                )}
                {phoneTouched && customerPhone && validatePhone(customerPhone).isValid && (
                  <p className="text-[10px] text-green-400 mt-1 flex items-center gap-1">
                    <span>✓</span> Valid Indian mobile number
                  </p>
                )}
              </div>

              {/* Delivery Address Section */}
              <div className="pt-2 border-t border-slate-800">
                <div className="flex items-center gap-2 mb-2">
                  <House className="w-4 h-4 text-amber-500" />
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest">Home Delivery Address *</label>
                </div>
                <textarea
                  required
                  rows={2}
                  placeholder="House/Flat No., Building Name, Street/Road (e.g., House 42, Gurujimukku, Peringathur)"
                  value={deliveryAddress}
                  onChange={(e) => {
                    setDeliveryAddress(e.target.value);
                    if (!addressTouched) setAddressTouched(true);
                  }}
                  onBlur={() => setAddressTouched(true)}
                  className={`px-4 py-2.5 text-sm bg-surface-800/50 border rounded-xl text-surface-100 w-full focus:outline-none transition-smooth ${
                    addressTouched && !validateAddress(deliveryAddress).isValid
                      ? "border-red-500 focus:ring-red-500/50"
                      : addressTouched && validateAddress(deliveryAddress).isValid
                      ? "border-green-500 focus:ring-green-500/50"
                      : "border-slate-800 focus:border-amber-500"
                  }`}
                />
                {addressTouched && !validateAddress(deliveryAddress).isValid && (
                  <p className="text-[10px] text-red-400 mt-1 flex items-center gap-1">
                    <Warning className="w-3.5 h-3.5" /> {validateAddress(deliveryAddress).message}
                  </p>
                )}
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Landmark / Locality (Optional)</label>
                  <input
                    type="text"
                    placeholder="Near Bus Stand / School"
                    value={deliveryLandmark}
                    onChange={(e) => setDeliveryLandmark(e.target.value)}
                    className="px-3.5 py-2.5 text-xs"
                  />
                </div>
                <div>
                  <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Delivery Notes (Optional)</label>
                  <input
                    type="text"
                    placeholder="Ring bell / Leave at door"
                    value={deliveryNotes}
                    onChange={(e) => setDeliveryNotes(e.target.value)}
                    className="px-3.5 py-2.5 text-xs"
                  />
                </div>
              </div>

              <button
                type="submit"
                disabled={isOrdering || (branchTouched && !selectedBranch) || (phoneTouched && !validatePhone(customerPhone).isValid) || (addressTouched && !validateAddress(deliveryAddress).isValid)}
                className="w-full py-4 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-500 text-slate-950 font-bold text-sm border-transparent select-none mt-2 hover:from-amber-500 hover:to-amber-400 transition-smooth shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isOrdering ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24">
                      <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                      <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
                    </svg>
                    Processing order...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
                    </svg>
                    Order via WhatsApp
                  </>
                )}
              </button>
              <p className="text-[10px] text-slate-500 text-center leading-normal mt-2">
                You&apos;ll be redirected to WhatsApp with your order details and home delivery address.
              </p>
            </form>
          </div>
        </div>
      )}

      {/* Success Modal */}
      {orderPlaced && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-6 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-md glass rounded-3xl p-6 text-center border-amber-500/20 relative animate-scaleUp glow">
            <div className="w-16 h-16 rounded-full bg-amber-500/10 border border-amber-500/20 flex items-center justify-center mx-auto mb-4 text-amber-500">
              <svg className="w-8 h-8" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
                <path strokeLinecap="round" strokeLinejoin="round" d="M5 13l4 4L19 7" />
              </svg>
            </div>

            {lastPlacedOrderId && (
              <span className="inline-block px-3 py-1 rounded-full bg-amber-500/10 text-amber-400 font-mono font-bold text-xs border border-amber-500/30 mb-2">
                #{lastPlacedOrderId}
              </span>
            )}

            <h3 className="text-xl font-extrabold text-white mb-2">Order Dispatched successfully!</h3>
            <p className="text-sm text-slate-400 mb-6">
              Our kitchen has received your order. Estimated delivery is around 35 minutes!
            </p>

            <div className="p-4 rounded-2xl bg-slate-900 border border-slate-800 text-left space-y-3 mb-6">
              {lastPlacedOrderId && (
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Order ID</span>
                  <span className="text-xs font-mono font-bold text-white">{lastPlacedOrderId}</span>
                </div>
              )}
              {lastPlacedOrderBranch && (
                <div className="flex justify-between items-center">
                  <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Branch</span>
                  <span className="text-xs font-bold text-amber-400">{lastPlacedOrderBranch}</span>
                </div>
              )}
              <div className="flex justify-between items-center">
                <span className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Estimated Arrival</span>
                <span className="text-xs font-bold text-amber-500">35 min</span>
              </div>
              <div className="flex justify-between items-center text-xs border-t border-slate-800 pt-3">
                <span className="text-slate-400">Delivery Status</span>
                <span className="text-emerald-400 font-extrabold flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-ping"></span>
                  Processing
                </span>
              </div>
            </div>

            <button
              onClick={() => setOrderPlaced(false)}
              className="w-full btn-primary py-4 bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-bold border-transparent shadow-lg shadow-emerald-600/30"
            >
              Continue Shopping Groceries
            </button>
          </div>
        </div>
      )}

      {/* Floating WhatsApp & Call Buttons */}
      <div className={`fixed ${cart.length > 0 && !isCartOpen ? "bottom-24" : "bottom-6"} right-6 z-40 flex flex-col gap-3 group transition-all duration-300`}>
        <a
          href="https://wa.me/918113021038?text=Hi%20Easy%20Mart%20Supermarket%2C%20I%20would%20like%20to%20order%20groceries."
          target="_blank"
          rel="noopener noreferrer"
          className="fab-whatsapp"
          title="Chat on WhatsApp (+91 81130 21038)"
          aria-label="Contact on WhatsApp"
        >
          <svg className="w-6 h-6 md:w-7 md:h-7 fill-current" viewBox="0 0 24 24">
            <path d="M.057 24l1.687-6.163c-1.041-1.804-1.588-3.849-1.587-5.946.003-6.556 5.338-11.891 11.893-11.891 3.181.001 6.167 1.24 8.413 3.488 2.245 2.248 3.481 5.236 3.48 8.414-.003 6.557-5.338 11.892-11.893 11.892-1.99-.001-3.951-.5-5.688-1.448l-6.305 1.654zm6.597-3.807c1.676.995 3.276 1.591 5.392 1.592 5.448 0 9.886-4.434 9.889-9.885.002-5.462-4.415-9.89-9.881-9.892-5.452 0-9.887 4.434-9.889 9.884-.001 2.225.651 3.891 1.746 5.634l-.999 3.648 3.742-.981zm11.387-5.464c-.301-.15-1.785-.881-2.062-.982-.276-.101-.477-.15-.678.15-.201.301-.778.982-.954 1.183-.175.201-.351.226-.652.076-.301-.15-1.27-.468-2.42-1.494-.897-.8-1.502-1.788-1.678-2.089-.175-.301-.019-.464.131-.614.136-.135.301-.351.452-.527.15-.176.201-.301.301-.502.101-.201.05-.377-.025-.527-.075-.15-.678-1.635-.929-2.235-.244-.585-.494-.506-.678-.515-.175-.008-.377-.01-.578-.01-.201 0-.527.075-.803.377-.276.301-1.054 1.029-1.054 2.512 0 1.483 1.08 2.913 1.23 3.114.15.201 2.124 3.243 5.147 4.547.719.31 1.28.495 1.718.634.723.23 1.38.197 1.9.12.58-.086 1.785-.729 2.036-1.431.251-.703.251-1.304.175-1.431-.075-.127-.276-.201-.577-.351z" />
          </svg>
        </a>

        <a
          href="tel:+918113021038"
          className="fab-call"
          title="Call (+91 81130 21038)"
          aria-label="Call Supermarket"
        >
          <svg className="w-6 h-6 md:w-7 md:h-7" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M2.25 6.75c0 8.284 6.716 15 15 15h2.25a2.25 2.25 0 002.25-2.25v-1.372c0-.516-.351-.966-.852-1.091l-4.423-1.106c-.44-.11-.902.055-1.173.417l-1.021 1.361c-3.14-1.282-5.67-3.812-6.952-6.952l1.361-1.021c.362-.271.527-.734.417-1.173L6.963 3.102a1.125 1.125 0 00-1.091-.852H4.5A2.25 2.25 0 002.25 4.5v2.25z" />
          </svg>
        </a>
      </div>
    </div>
  );
}
