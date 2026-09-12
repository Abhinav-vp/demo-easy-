"use client"

import React, { useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Fire, Warning, CheckCircle, House, X } from "@phosphor-icons/react";
import { MENU_ITEMS, MenuItem, Offer, getMenuItems, getActiveOffers, getEffectivePrice, saveEnquiry, generateOrderId, formatWhatsAppOrderMessage } from "@/lib/restaurant-data";
import { submitOrderAction } from "@/app/actions/order-actions";
import { fetchMenuItemsAction, fetchOffersAction } from "@/app/actions/admin-actions";

export default function MenuPage() {
  const [cart, setCart] = useState<{ dish: MenuItem; quantity: number }[]>([]);
  const [products, setProducts] = useState<MenuItem[]>(MENU_ITEMS);
  const [offers, setOffers] = useState<Offer[]>([]);
  const [prodLoading, setProdLoading] = useState(true);
  const [isCartOpen, setIsCartOpen] = useState(false);
  const [isCheckoutOpen, setIsCheckoutOpen] = useState(false);
  const [selectedBranch, setSelectedBranch] = useState<string>("");
  const [branchTouched, setBranchTouched] = useState<boolean>(false);
  const [isOrdering, setIsOrdering] = useState(false);
  const [customerName, setCustomerName] = useState("");
  const [customerPhone, setCustomerPhone] = useState("");
  const [deliveryAddress, setDeliveryAddress] = useState("");
  const [deliveryLandmark, setDeliveryLandmark] = useState("");
  const [deliveryNotes, setDeliveryNotes] = useState("");
  const [phoneTouched, setPhoneTouched] = useState(false);
  const [addressTouched, setAddressTouched] = useState(false);
  const [orderError, setOrderError] = useState("");

  React.useEffect(() => {
    let isMounted = true;
    const loadProducts = async () => {
      // Instant render
      setProducts(getMenuItems());
      setOffers(getActiveOffers());

      try {
        const [menuRes, offersRes] = await Promise.all([
          fetchMenuItemsAction(),
          fetchOffersAction(),
        ]);
        if (!isMounted) return;
        if (menuRes.success && menuRes.data && menuRes.data.length > 0) {
          setProducts(menuRes.data);
        }
        if (offersRes.success && offersRes.data) {
          setOffers(offersRes.data.filter(o => o.active));
        }
      } catch (err) {
        console.warn("Menu fetch from Supabase fallback:", err);
      } finally {
        if (isMounted) setProdLoading(false);
      }
    };

    loadProducts();

    const onProductsUpdated = () => loadProducts();
    window.addEventListener("orderflow_products_updated", onProductsUpdated);

    return () => {
      isMounted = false;
      window.removeEventListener("orderflow_products_updated", onProductsUpdated);
    };
  }, []);

  const addToCart = (dish: MenuItem) => {
    const existing = cart.find((c) => c.dish.id === dish.id);
    if (existing) {
      setCart(cart.map((c) => (c.dish.id === dish.id ? { ...c, quantity: c.quantity + 1 } : c)));
    } else {
      setCart([...cart, { dish, quantity: 1 }]);
    }
    setIsCartOpen(true);
  };

  const updateQty = (dishId: string, delta: number) => {
    const updated = cart
      .map((c) => (c.dish.id === dishId ? { ...c, quantity: c.quantity + delta } : c))
      .filter((c) => c.quantity > 0);
    setCart(updated);
  };

  const subtotal = cart.reduce((s, c) => {
    const { price } = getEffectivePrice(c.dish, offers);
    return s + price * c.quantity;
  }, 0);

  const cartCount = cart.reduce((s, c) => s + c.quantity, 0);

  const validatePhone = (phone: string): { isValid: boolean; message: string } => {
    const clean = phone.replace(/[\s-]/g, '');
    if (!clean) return { isValid: false, message: "Phone number is required" };
    const indianMobileRegex = /^(?:\+?91)?[6-9]\d{9}$/;
    if (!indianMobileRegex.test(clean)) {
      return { isValid: false, message: "Please enter a valid 10-digit mobile number" };
    }
    return { isValid: true, message: "" };
  };

  const validateAddress = (address: string): { isValid: boolean; message: string } => {
    if (!address || address.trim().length < 5) {
      return { isValid: false, message: "Please enter a complete home delivery address (min 5 characters)" };
    }
    return { isValid: true, message: "" };
  };

  const placeOrder = async (e: React.FormEvent) => {
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

    try {
      const orderId = generateOrderId();
      const itemList = cart.map((i) => `${i.quantity}x ${i.dish.name}`).join(", ");
      const totalQty = cart.reduce((s, c) => s + c.quantity, 0);
      const totalPrice = parseFloat(subtotal.toFixed(2));

      const cartItems = cart.map(c => {
        const p = getEffectivePrice(c.dish, offers);
        return { name: c.dish.name, quantity: c.quantity, unitPrice: p.price };
      });

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
        items: itemList,
        itemDetails: cartItems.map(i => ({ ...i, lineTotal: i.quantity * i.unitPrice })),
        totalQuantity: totalQty,
        totalPrice,
        createdAt: new Date().toISOString(),
      };

      // Save enquiry directly to Supabase
      submitOrderAction(orderData).catch(err => {
        console.error("Supabase order submission error:", err);
      });

      // Local backup
      saveEnquiry(orderData);

      // Open WhatsApp
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
          cartItems,
          subtotal,
          finalTotal: totalPrice,
        });
        const waUrl = `https://wa.me/${whatsappNumber}?text=${encodeURIComponent(formattedMessage)}`;
        window.open(waUrl, "_blank");
      } catch (waErr) {
        console.warn("WhatsApp redirect failed", waErr);
      }

      setCart([]);
      setSelectedBranch("");
      setBranchTouched(false);
      setCustomerPhone("");
      setCustomerName("");
      setDeliveryAddress("");
      setDeliveryLandmark("");
      setDeliveryNotes("");
      setPhoneTouched(false);
      setAddressTouched(false);
      setIsCartOpen(false);
      setIsCheckoutOpen(false);
    } catch (err: any) {
      console.error(err);
      setOrderError(err.message || "Failed to place order");
    } finally {
      setIsOrdering(false);
    }
  };

  return (
    <div className="min-h-screen bg-slate-950/40 text-slate-100">
      {/* Header */}
      <div className="sticky top-0 z-30 glass-light backdrop-blur-md px-4 md:px-6 py-4 flex items-center justify-between border-b border-slate-800/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl overflow-hidden shadow-lg shadow-amber-500/20 border border-amber-500/20 flex-shrink-0">
            <Image src="/logo.png" alt="ABR Asma Logo" width={40} height={40} className="object-cover w-full h-full" />
          </div>
          <div>
            <h1 className="text-lg md:text-xl font-extrabold text-white leading-none">Our Menu</h1>
            <p className="text-[9px] md:text-[10px] uppercase font-bold tracking-wider text-amber-500">ABR Asma Restaurant</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          <button
            onClick={() => setIsCartOpen(true)}
            className="relative p-2.5 rounded-xl glass hover:bg-slate-800/80 transition-smooth"
          >
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
              <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
            </svg>
            {cartCount > 0 && (
              <span className="absolute -top-1.5 -right-1.5 w-5 h-5 rounded-full bg-red-500 text-[10px] font-bold text-white flex items-center justify-center shadow-md">
                {cartCount}
              </span>
            )}
          </button>
          <Link href="/" className="text-sm text-amber-400 font-semibold hover:text-amber-300 transition-smooth">
            ← Home
          </Link>
        </div>
      </div>

      {/* Active Offers Banner */}
      {offers.length > 0 && (
        <div className="px-4 md:px-6 py-3 border-b border-slate-800/30">
          {offers.map(offer => (
            <div key={offer.id} className="flex items-center gap-3 px-4 py-2.5 rounded-xl bg-gradient-to-r from-amber-500/10 to-orange-500/5 border border-amber-500/20 mb-2 last:mb-0">
              <Fire className="w-5 h-5 text-amber-500" weight="fill" />
              <span className="text-sm font-bold text-amber-400 flex-1">{offer.title}</span>
              <span className="text-xs font-bold text-amber-500 bg-amber-500/10 px-2.5 py-1 rounded-full flex items-center gap-1">
                {offer.discountType === 'percentage' ? `${offer.discountValue}% OFF` : `₹${offer.discountValue} OFF`}
              </span>
            </div>
          ))}
        </div>
      )}

      {/* Menu Grid */}
      <div className="max-w-6xl mx-auto p-4 md:p-6">
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {prodLoading ? (
            <div className="col-span-3 text-center text-slate-400 py-20">Loading products...</div>
          ) : (
            products.map((dish) => {
              const priceInfo = getEffectivePrice(dish, offers);
              return (
                <div key={dish.id} className="glass rounded-2xl overflow-hidden flex flex-col hover:scale-[1.01] transition-smooth group">
                  <div className="h-40 w-full relative overflow-hidden bg-slate-900">
                    {dish.image ? (
                      dish.image.startsWith("/") ? (
                        <Image src={dish.image} alt={dish.name} fill className="object-cover group-hover:scale-105 transition-smooth" />
                      ) : (
                        // eslint-disable-next-line @next/next/no-img-element
                        <img src={dish.image} alt={dish.name} className="w-full h-full object-cover group-hover:scale-105 transition-smooth" />
                      )
                    ) : (
                      <div className="w-full h-full flex items-center justify-center text-slate-500 text-sm">No image</div>
                    )}
                    {priceInfo.offerTitle && (
                      <span className="absolute top-3 right-3 px-2.5 py-1 rounded-lg bg-red-500/90 text-[10px] uppercase font-bold text-white">
                        {offers.find(o => o.title === priceInfo.offerTitle)?.discountType === 'percentage'
                          ? `${offers.find(o => o.title === priceInfo.offerTitle)?.discountValue}% OFF`
                          : `₹${offers.find(o => o.title === priceInfo.offerTitle)?.discountValue} OFF`
                        }
                      </span>
                    )}
                  </div>
                  <div className="p-4 flex-1 flex flex-col">
                    <h3 className="font-bold text-base md:text-lg text-white group-hover:text-amber-400 transition-smooth">{dish.name}</h3>
                    <p className="text-sm text-slate-400 mt-1 line-clamp-2 flex-1">{dish.description}</p>
                    <div className="mt-4 flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        {priceInfo.originalPrice ? (
                          <>
                            <span className="text-sm text-slate-500 line-through">₹{priceInfo.originalPrice.toFixed(2)}</span>
                            <span className="font-extrabold text-amber-400">₹{priceInfo.price.toFixed(2)}</span>
                          </>
                        ) : (
                          <span className="font-extrabold text-amber-400">₹{priceInfo.price.toFixed(2)}</span>
                        )}
                      </div>
                      <button onClick={() => addToCart(dish)} className="btn-secondary px-3 py-2 text-xs font-bold">
                        + Add
                      </button>
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>

      {/* Floating Cart Button */}
      {cartCount > 0 && !isCartOpen && !isCheckoutOpen && (
        <button
          onClick={() => setIsCartOpen(true)}
          className="fixed bottom-6 right-6 z-40 bg-amber-500 text-slate-950 p-4 rounded-full shadow-2xl flex items-center gap-2 hover:bg-amber-400 transition-smooth font-extrabold"
        >
          <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}>
            <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
          </svg>
          Cart ({cartCount})
        </button>
      )}

      {/* Cart Drawer — Products + Quantity only */}
      {isCartOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-slate-950/60 backdrop-blur-sm animate-fadeIn">
          <div className="absolute inset-0 -z-10" onClick={() => setIsCartOpen(false)} />
          <div className="w-full max-w-md bg-slate-900 p-6 border-l border-slate-800 h-full overflow-y-auto flex flex-col">
            <div className="flex justify-between items-center mb-4">
              <h3 className="font-extrabold text-white text-lg">Your Cart</h3>
              <button onClick={() => setIsCartOpen(false)} className="text-slate-400 hover:text-white transition-smooth">
                <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {cart.length === 0 ? (
              <div className="text-center py-20 text-slate-500 flex-1 flex flex-col items-center justify-center">
                <svg className="w-12 h-12 mb-4 text-slate-700" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                  <path strokeLinecap="round" strokeLinejoin="round" d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" />
                </svg>
                <p className="text-sm font-semibold">Cart is empty</p>
              </div>
            ) : (
              <>
                <div className="space-y-3 flex-1 overflow-y-auto mb-4">
                  {cart.map((c) => {
                    const priceInfo = getEffectivePrice(c.dish, offers);
                    return (
                      <div key={c.dish.id} className="flex justify-between items-center py-3 border-b border-slate-800/40">
                        <div>
                          <div className="font-bold text-sm text-white">{c.dish.name}</div>
                          <div className="flex items-center gap-1.5 mt-0.5">
                            {priceInfo.originalPrice ? (
                              <>
                                <span className="text-[10px] text-slate-500 line-through">₹{priceInfo.originalPrice.toFixed(2)}</span>
                                <span className="text-xs text-amber-400 font-medium">₹{priceInfo.price.toFixed(2)}</span>
                              </>
                            ) : (
                              <span className="text-xs text-amber-400">₹{priceInfo.price.toFixed(2)}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex items-center gap-3">
                          <button onClick={() => updateQty(c.dish.id, -1)} className="w-11 h-11 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 hover:bg-slate-700 transition-smooth">-</button>
                          <span className="text-sm font-extrabold text-white w-4 text-center">{c.quantity}</span>
                          <button onClick={() => updateQty(c.dish.id, 1)} className="w-11 h-11 rounded-lg bg-slate-800 border border-slate-700 flex items-center justify-center text-slate-300 hover:bg-slate-700 transition-smooth">+</button>
                        </div>
                      </div>
                    );
                  })}
                </div>

                <div className="border-t border-slate-800 pt-4">
                  <div className="flex items-center justify-between mb-4">
                    <span className="font-bold text-slate-400">Total</span>
                    <span className="font-extrabold text-xl text-amber-500">₹{subtotal.toFixed(2)}</span>
                  </div>
                  <button
                    onClick={() => { setIsCartOpen(false); setIsCheckoutOpen(true); }}
                    className="w-full py-3.5 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-500 text-slate-950 font-bold text-sm hover:from-amber-500 hover:to-amber-400 transition-smooth shadow-lg shadow-amber-500/20 flex items-center justify-center gap-2"
                  >
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}>
                      <path strokeLinecap="round" strokeLinejoin="round" d="M9 5l7 7-7 7" />
                    </svg>
                    Proceed to Checkout
                  </button>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {/* Checkout Modal */}
      {isCheckoutOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 md:p-6 bg-slate-950/80 backdrop-blur-sm animate-fadeIn">
          <div className="w-full max-w-lg glass rounded-3xl p-6 md:p-8 border-amber-500/20 relative animate-scaleUp">
            <button
              onClick={() => setIsCheckoutOpen(false)}
              className="absolute top-3 right-3 p-3 text-slate-400 hover:text-white rounded-lg transition-smooth"
              aria-label="Close Checkout Modal"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-xl font-extrabold text-white mb-1">Checkout</h3>
            <p className="text-sm text-slate-400 mb-6">Complete your order details</p>

            <div className="glass rounded-2xl p-4 mb-6 border border-slate-800 max-h-48 overflow-y-auto">
              {cart.map(c => {
                const priceInfo = getEffectivePrice(c.dish, offers);
                return (
                  <div key={c.dish.id} className="flex justify-between items-center py-2 border-b border-slate-800/30 last:border-0">
                    <span className="text-sm text-white">{c.quantity}x {c.dish.name}</span>
                    <span className="text-sm text-amber-400 font-bold">₹{(priceInfo.price * c.quantity).toFixed(2)}</span>
                  </div>
                );
              })}
              <div className="flex justify-between items-center pt-3 mt-2 border-t border-slate-700">
                <span className="text-sm font-bold text-white">Total</span>
                <span className="text-lg font-extrabold text-amber-500">₹{subtotal.toFixed(2)}</span>
              </div>
            </div>

            {orderError && (
              <div className="mb-4 p-4 rounded-xl bg-red-500/10 border border-red-500/20 text-red-500 text-xs">
                {orderError}
              </div>
            )}

            <form onSubmit={placeOrder} className="space-y-4 text-left">
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
                <input value={customerName} onChange={(e) => setCustomerName(e.target.value)} required placeholder="Enter your full name" className="px-4 py-3 text-sm" />
              </div>
              <div>
                <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Phone Number</label>
                <input 
                  value={customerPhone} 
                  onChange={(e) => {
                    setCustomerPhone(e.target.value);
                    if (!phoneTouched) setPhoneTouched(true);
                  }} 
                  onBlur={() => setPhoneTouched(true)}
                  type="tel" 
                  required 
                  placeholder="10-digit Mobile Number (e.g. 8113021038)" 
                  className={`px-4 py-3 text-sm ${
                    phoneTouched && customerPhone && !validatePhone(customerPhone).isValid
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
                    <CheckCircle className="w-3.5 h-3.5" /> Valid Indian mobile number
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
                disabled={isOrdering || cart.length === 0 || (branchTouched && !selectedBranch) || (phoneTouched && !validatePhone(customerPhone).isValid) || (addressTouched && !validateAddress(deliveryAddress).isValid)} 
                className="w-full py-4 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-500 text-slate-950 font-bold text-sm hover:from-amber-500 hover:to-amber-400 transition-smooth shadow-lg shadow-amber-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
              >
                {isOrdering ? (
                  <>
                    <svg className="w-4 h-4 animate-spin" fill="none" viewBox="0 0 24 24"><circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" /><path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" /></svg>
                    Placing order...
                  </>
                ) : (
                  <>
                    <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" /></svg>
                    Order via WhatsApp
                  </>
                )}
              </button>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
