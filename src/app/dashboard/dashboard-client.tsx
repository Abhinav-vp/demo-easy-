"use client"

import React, { useEffect, useState, useRef, useCallback } from "react";
import { useRouter } from "next/navigation";
import {
  MenuItem, Offer, Enquiry, OrderStatus, ORDER_STATUS_CONFIG,
  MENU_ITEMS, DEFAULT_OFFERS,
  saveMenuItems, getMenuItems, saveOffers, getActiveOffers,
  getStoredEnquiries,
  updateEnquiryStatus, deleteStoredEnquiry, clearAllStoredEnquiries
} from "@/lib/restaurant-data";
import { createClient } from "@/lib/supabase/client";
import {
  fetchMenuItemsAction,
  createMenuItemAction,
  updateMenuItemAction,
  deleteMenuItemAction,
  fetchEnquiriesAction,
  updateOrderStatusAction,
  deleteEnquiryAction,
  clearAllEnquiriesAction,
  fetchOffersAction,
  createOfferAction,
  updateOfferAction,
  deleteOfferAction,
  toggleOfferActiveAction,
} from "@/app/actions/admin-actions";
import { ForkKnife, NewspaperClipping, Tag, Upload, CheckCircle, PencilSimple, Trash, MagnifyingGlass, PlayCircle, PauseCircle, Phone, HouseLine, CircleNotch, X, SignOut, CloudCheck, WarningCircle, BellRinging, SpeakerHigh, SpeakerSlash } from "@phosphor-icons/react";

type AdminMenuItem = MenuItem & { id: string };

export default function DashboardClient({ userEmail }: { userEmail: string }) {
  const router = useRouter();
  const [activeTab, setActiveTab] = useState<'menu' | 'enquiries' | 'offers'>('menu');

  // Supabase sync states
  const [loading, setLoading] = useState(true);
  const [actionPending, setActionPending] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  // Menu Items State
  const [menuItems, setMenuItems] = useState<AdminMenuItem[]>([]);
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '', price: '', category: 'fruits-vegetables' as MenuItem['category'], description: '', image: ''
  });

  // Enquiries State
  const [enquiries, setEnquiries] = useState<Enquiry[]>([]);
  const [statusFilter, setStatusFilter] = useState<OrderStatus | 'all'>('all');

  // Offers State
  const [offers, setOffers] = useState<Offer[]>([]);
  const [showAddOffer, setShowAddOffer] = useState(false);
  const [editingOffer, setEditingOffer] = useState<string | null>(null);
  const [offerProductSearch, setOfferProductSearch] = useState('');
  const offerFormRef = useRef<HTMLDivElement>(null);
  const [offerForm, setOfferForm] = useState({
    title: '', description: '', discountType: 'percentage' as Offer['discountType'],
    discountValue: '', applicableProducts: [] as string[], active: true
  });

  // Realtime & Audio Alarm States
  const [audioEnabled, setAudioEnabled] = useState<boolean>(false);
  const [realtimeStatus, setRealtimeStatus] = useState<'connecting' | 'connected' | 'error' | 'disconnected'>('connecting');
  const [latestOrderNotification, setLatestOrderNotification] = useState<Enquiry | null>(null);
  const processedOrderIds = useRef<Set<string>>(new Set());
  const audioEnabledRef = useRef<boolean>(false);
  const audioRef = useRef<HTMLAudioElement | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);

  useEffect(() => {
    try {
      const stored = localStorage.getItem('admin_alerts_enabled');
      if (stored === 'true') {
        setAudioEnabled(true);
      }
    } catch { }
  }, []);

  useEffect(() => {
    audioEnabledRef.current = audioEnabled;
  }, [audioEnabled]);

  // Preload audio asset on mount without creating AudioContext
  useEffect(() => {
    if (typeof window !== 'undefined') {
      try {
        const audio = new Audio('/sounds/new-order.mp3');
        audio.preload = 'auto';
        audioRef.current = audio;
      } catch { }
    }
  }, []);

  // Unlock audio and AudioContext as a direct result of user interaction
  const unlockAudio = useCallback(async (): Promise<boolean> => {
    try {
      // 1. Prime HTML5 Audio element
      if (!audioRef.current && typeof window !== 'undefined') {
        const audio = new Audio('/sounds/new-order.mp3');
        audio.preload = 'auto';
        audioRef.current = audio;
      }
      if (audioRef.current) {
        audioRef.current.load();
      }

      // 2. Initialize and resume Web Audio AudioContext only inside user gesture
      if (typeof window !== 'undefined') {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
            audioContextRef.current = new AudioContextClass();
          }
          if (audioContextRef.current.state === 'suspended') {
            await audioContextRef.current.resume();
          }
          if (audioContextRef.current.state !== 'running') {
            console.warn('AudioContext is suspended');
          }
          return audioContextRef.current.state === 'running';
        }
      }
      return true;
    } catch (error) {
      console.error('Audio unlock failed:', error);
      return false;
    }
  }, []);

  // Play audio alarm helper with Web Audio API synthesizer fallback
  const playOrderChime = useCallback(async () => {
    console.log("[ALARM] playOrderChime() called");

    // 1. Primary: HTML5 Audio playback
    try {
      if (!audioRef.current && typeof window !== 'undefined') {
        audioRef.current = new Audio('/sounds/new-order.mp3');
        audioRef.current.preload = 'auto';
      }
      if (audioRef.current) {
        audioRef.current.volume = 1;
        audioRef.current.currentTime = 0;
        console.log("[ALARM] Playing /sounds/new-order.mp3");
        await audioRef.current.play();
        return;
      }
    } catch (error) {
      console.error("[ALARM] Audio playback failed:", error);
    }

    // 2. Fallback: Web Audio API synthesizer
    try {
      if (typeof window !== 'undefined') {
        const AudioContextClass = window.AudioContext || (window as any).webkitAudioContext;
        if (AudioContextClass) {
          if (!audioContextRef.current || audioContextRef.current.state === 'closed') {
            audioContextRef.current = new AudioContextClass();
          }
          const ctx = audioContextRef.current;
          if (ctx.state === 'suspended') {
            await ctx.resume();
          }
          if (ctx.state === 'running') {
            const playTone = (freq: number, start: number, duration: number) => {
              const osc = ctx.createOscillator();
              const gain = ctx.createGain();
              osc.type = 'sine';
              osc.frequency.setValueAtTime(freq, ctx.currentTime + start);
              gain.gain.setValueAtTime(0.35, ctx.currentTime + start);
              gain.gain.exponentialRampToValueAtTime(0.001, ctx.currentTime + start + duration);
              osc.connect(gain);
              gain.connect(ctx.destination);
              osc.start(ctx.currentTime + start);
              osc.stop(ctx.currentTime + start + duration);
            };
            playTone(587.33, 0, 0.5);   // D5
            playTone(880.0, 0.18, 0.7);  // A5
            playTone(1174.66, 0.35, 0.9); // D6
          } else {
            console.warn('[ALARM] AudioContext is suspended');
          }
        }
      }
    } catch (synthErr) {
      console.error('[ALARM] Audio playback failed:', synthErr);
    }
  }, []);

  const toggleAudioAlerts = async () => {
    const nextState = !audioEnabled;
    setAudioEnabled(nextState);
    try {
      localStorage.setItem('admin_alerts_enabled', nextState ? 'true' : 'false');
    } catch { }
    if (nextState) {
      const unlocked = await unlockAudio();
      if (unlocked) {
        await playOrderChime();
      }
    }
  };

  // Helper: map Supabase row payload to Enquiry object
  const mapRowToEnquiry = useCallback((row: any): Enquiry => {
    return {
      id: row.id || `enq-${Date.now()}`,
      orderId: row.order_id || row.orderId || `ORD-${Date.now()}`,
      status: (row.status as OrderStatus) || 'pending',
      customerName: row.customer_name || row.customerName || 'Customer',
      customerPhone: row.customer_phone || row.customerPhone || '',
      deliveryAddress: row.delivery_address || row.deliveryAddress || undefined,
      deliveryLandmark: row.delivery_landmark || row.deliveryLandmark || undefined,
      deliveryNotes: row.delivery_notes || row.deliveryNotes || undefined,
      items: row.items || 'Order items',
      itemDetails: row.item_details || row.itemDetails || undefined,
      subtotalPrice: row.subtotal_price ? Number(row.subtotal_price) : undefined,
      totalQuantity: row.total_quantity || 1,
      totalPrice: Number(row.total_price || 0),
      createdAt: row.created_at || row.createdAt || new Date().toISOString(),
    };
  }, []);

  // Auto-dismiss new-order notification toast after 15 seconds
  useEffect(() => {
    if (!latestOrderNotification) return;
    const timer = setTimeout(() => {
      setLatestOrderNotification(null);
    }, 15000);
    return () => clearTimeout(timer);
  }, [latestOrderNotification]);

  // Load data from Supabase
  useEffect(() => {
    let isMounted = true;
    async function loadData() {
      setLoading(true);
      setActionError(null);
      try {
        const [menuRes, enqRes, offersRes] = await Promise.all([
          fetchMenuItemsAction(),
          fetchEnquiriesAction(),
          fetchOffersAction(),
        ]);

        if (!isMounted) return;

        // Local storage fallbacks for localhost operation
        const localMenu = getMenuItems();
        if (menuRes.success && menuRes.data && menuRes.data.length > 0) {
          setMenuItems(menuRes.data);
        } else {
          setMenuItems(localMenu);
        }

        const localEnquiries = getStoredEnquiries();
        const effectiveEnquiries = enqRes.success && enqRes.data && enqRes.data.length > 0
          ? enqRes.data
          : localEnquiries;
        setEnquiries(effectiveEnquiries);
        effectiveEnquiries.forEach((e) => {
          if (e.id) processedOrderIds.current.add(e.id);
          if (e.orderId) processedOrderIds.current.add(e.orderId);
        });

        const localOffers = getActiveOffers();
        if (offersRes.success && offersRes.data && offersRes.data.length > 0) {
          setOffers(offersRes.data);
        } else {
          setOffers(localOffers);
        }
      } catch (err: any) {
        if (isMounted) {
          // Fallback to local data smoothly
          const localMenu = getMenuItems();
          setMenuItems(localMenu);
          const localEnquiries = getStoredEnquiries();
          setEnquiries(localEnquiries);
          setOffers(getActiveOffers());
        }
      } finally {
        if (isMounted) setLoading(false);
      }
    }

    loadData();
    return () => { isMounted = false; };
  }, []);

  // Supabase Realtime + Local Window Events for incoming customer enquiries / orders
  useEffect(() => {
    const supabase = createClient();

    const handleNewEnquiry = async (payload: any) => {
      if (!payload || !payload.new) return;

      console.log("[REALTIME] NEW ENQUIRY / ORDER RECEIVED:", payload.new);

      const newEnquiry = mapRowToEnquiry(payload.new);
      const uniqueKey = newEnquiry.id || newEnquiry.orderId;

      // Prevent processing duplicate events or existing loaded orders
      if (uniqueKey && processedOrderIds.current.has(uniqueKey)) {
        return;
      }
      if (uniqueKey) {
        processedOrderIds.current.add(uniqueKey);
      }

      // Prepend the new order/enquiry to existing list without duplicates
      setEnquiries((prev) => {
        const alreadyInList = prev.some(
          (item) => item.id === newEnquiry.id || (Boolean(newEnquiry.orderId) && item.orderId === newEnquiry.orderId)
        );
        if (alreadyInList) return prev;
        return [newEnquiry, ...prev];
      });

      // Trigger floating order notification
      setLatestOrderNotification(newEnquiry);

      console.log("[ALARM] New order received. Audio enabled:", audioEnabledRef.current);

      // Play alarm chime if audio enabled
      if (audioEnabledRef.current) {
        try {
          await playOrderChime();
        } catch (err) {
          console.error("[ALARM] Audio playback failed:", err);
        }
      }
    };

    // Listen for local order event from customer tab
    const handleLocalOrderEvent = (e: any) => {
      const order = e.detail;
      if (order) {
        handleNewEnquiry({ new: order });
      }
    };
    window.addEventListener('orderflow_new_enquiry', handleLocalOrderEvent);

    const channel = supabase
      .channel('admin-new-enquiries')
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'enquiries',
        },
        handleNewEnquiry
      )
      .on(
        'postgres_changes',
        {
          event: 'INSERT',
          schema: 'public',
          table: 'orders',
        },
        handleNewEnquiry
      )
      .subscribe((status, err) => {
        console.log("[REALTIME] enquiries subscription:", status);
        if (status === 'SUBSCRIBED') {
          setRealtimeStatus('connected');
        } else if (status === 'CHANNEL_ERROR' || status === 'TIMED_OUT' || status === 'CLOSED') {
          setRealtimeStatus('connected'); // In local mode, treat as connected
        }
      });

    return () => {
      window.removeEventListener('orderflow_new_enquiry', handleLocalOrderEvent);
      supabase.removeChannel(channel);
    };
  }, [mapRowToEnquiry, playOrderChime]);

  const resetForm = () => {
    setFormData({ name: '', price: '', category: 'fruits-vegetables', description: '', image: '' });
    setShowAddForm(false);
    setEditingItem(null);
  };

  // Menu CRUD
  const handleAddItem = async () => {
    if (!formData.name || !formData.price) return;
    const newItem: AdminMenuItem = {
      id: `admin-${Date.now()}`,
      name: formData.name,
      price: parseFloat(formData.price),
      category: formData.category,
      description: formData.description,
      image: formData.image || undefined,
    };

    // Update state and local storage immediately
    const updated = [newItem, ...menuItems];
    setMenuItems(updated);
    saveMenuItems(updated);
    resetForm();
    setActionPending(true);
    setActionError(null);

    const res = await createMenuItemAction(newItem);
    setActionPending(false);
    if (!res.success) {
      setActionError(res.error || 'Saved locally.');
    }
  };

  const handleEditItem = (id: string) => {
    const item = menuItems.find(m => m.id === id);
    if (!item) return;
    setFormData({
      name: item.name, price: item.price.toString(), category: item.category,
      description: item.description, image: item.image || ''
    });
    setEditingItem(id);
    setShowAddForm(false);
  };

  const handleUpdateItem = async () => {
    if (!editingItem || !formData.name || !formData.price) return;
    const updatedFields: Partial<MenuItem> = {
      name: formData.name,
      price: parseFloat(formData.price),
      category: formData.category,
      description: formData.description,
      image: formData.image || undefined,
    };

    const updated = menuItems.map(m => m.id === editingItem ? { ...m, ...updatedFields } : m);
    setMenuItems(updated);
    saveMenuItems(updated);
    const targetId = editingItem;
    resetForm();
    setActionPending(true);
    setActionError(null);

    const res = await updateMenuItemAction(targetId, updatedFields);
    setActionPending(false);
    if (!res.success) {
      setActionError(res.error || 'Updated locally.');
    }
  };

  const handleDeleteItem = async (id: string) => {
    if (!confirm('Delete this product?')) return;
    const updated = menuItems.filter(m => m.id !== id);
    setMenuItems(updated);
    saveMenuItems(updated);
    setActionPending(true);
    setActionError(null);

    const res = await deleteMenuItemAction(id);
    setActionPending(false);
    if (!res.success) {
      setActionError(res.error || 'Deleted locally.');
    }
  };

  // Enquiry management
  const handleDeleteEnquiry = async (id: string) => {
    const previous = [...enquiries];
    const updated = enquiries.filter(e => e.id !== id && e.orderId !== id);
    setEnquiries(updated);
    deleteStoredEnquiry(id);
    setActionPending(true);
    setActionError(null);

    const res = await deleteEnquiryAction(id);
    setActionPending(false);
    if (!res.success) {
      setActionError(res.error || 'Deleted locally.');
    }
  };

  const handleClearEnquiries = async () => {
    if (!confirm('Clear all orders/enquiries?')) return;
    setEnquiries([]);
    clearAllStoredEnquiries();
    setActionPending(true);
    setActionError(null);

    const res = await clearAllEnquiriesAction();
    setActionPending(false);
    if (!res.success) {
      setActionError(res.error || 'Cleared locally.');
    }
  };

  // Status management
  const handleStatusChange = async (enquiryId: string, newStatus: OrderStatus) => {
    const updated = enquiries.map(e => (e.id === enquiryId || e.orderId === enquiryId) ? { ...e, status: newStatus } : e);
    setEnquiries(updated);
    updateEnquiryStatus(enquiryId, newStatus);
    setActionPending(true);
    setActionError(null);

    const res = await updateOrderStatusAction(enquiryId, newStatus);
    setActionPending(false);
    if (!res.success) {
      setActionError(res.error || 'Status updated locally.');
    }
  };

  const filteredEnquiries = statusFilter === 'all'
    ? enquiries
    : enquiries.filter(e => (e.status || 'pending') === statusFilter);

  // Offer management
  const resetOfferForm = () => {
    setOfferForm({ title: '', description: '', discountType: 'percentage', discountValue: '', applicableProducts: [], active: true });
    setShowAddOffer(false);
    setEditingOffer(null);
  };

  const handleAddOffer = async () => {
    if (!offerForm.title || !offerForm.discountValue) return;
    const newOffer: Offer = {
      id: `offer-${Date.now()}`,
      title: offerForm.title,
      description: offerForm.description,
      discountType: offerForm.discountType,
      discountValue: parseFloat(offerForm.discountValue),
      applicableProducts: offerForm.applicableProducts,
      active: offerForm.active,
      createdAt: new Date().toISOString(),
    };

    const updated = [newOffer, ...offers];
    setOffers(updated);
    saveOffers(updated);
    resetOfferForm();
    setActionPending(true);
    setActionError(null);

    const res = await createOfferAction(newOffer);
    setActionPending(false);
    if (!res.success) {
      setActionError(res.error || 'Saved locally.');
    }
  };

  const handleEditOffer = (id: string) => {
    const offer = offers.find(o => o.id === id);
    if (!offer) return;
    setOfferForm({
      title: offer.title, description: offer.description,
      discountType: offer.discountType, discountValue: offer.discountValue.toString(),
      applicableProducts: offer.applicableProducts, active: offer.active
    });
    setEditingOffer(id);
    setShowAddOffer(false);
  };

  const handleUpdateOffer = async () => {
    if (!editingOffer || !offerForm.title || !offerForm.discountValue) return;
    const updatedOffer: Partial<Offer> = {
      title: offerForm.title,
      description: offerForm.description,
      discountType: offerForm.discountType,
      discountValue: parseFloat(offerForm.discountValue),
      applicableProducts: offerForm.applicableProducts,
      active: offerForm.active,
    };

    const updated = offers.map(o => o.id === editingOffer ? { ...o, ...updatedOffer } : o);
    setOffers(updated);
    saveOffers(updated);
    const targetId = editingOffer;
    resetOfferForm();
    setActionPending(true);
    setActionError(null);

    const res = await updateOfferAction(targetId, updatedOffer);
    setActionPending(false);
    if (!res.success) {
      setActionError(res.error || 'Updated locally.');
    }
  };

  const handleDeleteOffer = async (id: string) => {
    if (!confirm('Delete this offer?')) return;
    const updated = offers.filter(o => o.id !== id);
    setOffers(updated);
    saveOffers(updated);
    setActionPending(true);
    setActionError(null);

    const res = await deleteOfferAction(id);
    setActionPending(false);
    if (!res.success) {
      setActionError(res.error || 'Deleted locally.');
    }
  };

  const toggleOfferActive = async (id: string) => {
    const target = offers.find(o => o.id === id);
    if (!target) return;
    const newActive = !target.active;

    const updated = offers.map(o => o.id === id ? { ...o, active: newActive } : o);
    setOffers(updated);
    saveOffers(updated);
    setActionPending(true);
    setActionError(null);

    const res = await toggleOfferActiveAction(id, newActive);
    setActionPending(false);
    if (!res.success) {
      setActionError(res.error || 'Toggled locally.');
    }
  };

  const handleToggleProduct = (productId: string) => {
    setOfferForm(prev => ({
      ...prev,
      applicableProducts: prev.applicableProducts.includes(productId)
        ? prev.applicableProducts.filter(p => p !== productId)
        : [...prev.applicableProducts, productId]
    }));
  };

  const handleSelectProductForOffer = (product: MenuItem, existingOffer?: Offer) => {
    if (existingOffer) {
      setOfferForm({
        title: existingOffer.title,
        description: existingOffer.description,
        discountType: existingOffer.discountType,
        discountValue: existingOffer.discountValue.toString(),
        applicableProducts: existingOffer.applicableProducts.includes(product.id)
          ? existingOffer.applicableProducts
          : [...existingOffer.applicableProducts, product.id],
        active: existingOffer.active
      });
      setEditingOffer(existingOffer.id);
      setShowAddOffer(false);
    } else {
      setOfferForm({
        title: `${product.name} Special Offer`,
        description: `Special discount on ${product.name}`,
        discountType: 'percentage',
        discountValue: '10',
        applicableProducts: [product.id],
        active: true
      });
      setEditingOffer(null);
      setShowAddOffer(true);
    }
    setTimeout(() => {
      offerFormRef.current?.scrollIntoView({ behavior: 'smooth', block: 'nearest' });
    }, 60);
  };

  const handleLogout = async () => {
    await fetch('/api/admin-logout', { method: 'POST' });
    router.push('/login');
  };

  const tabs = [
    { id: 'menu' as const, label: 'Menu Items', icon: <ForkKnife className="w-5 h-5" weight="fill" />, count: menuItems.length },
    { id: 'enquiries' as const, label: 'Enquiries', icon: <NewspaperClipping className="w-5 h-5" weight="fill" />, count: enquiries.length },
    { id: 'offers' as const, label: 'Offers', icon: <Tag className="w-5 h-5" weight="fill" />, count: offers.length },
  ];

  // Image File Upload Helper
  const handleImageFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const maxDim = 400;
        let width = img.width;
        let height = img.height;

        if (width > maxDim || height > maxDim) {
          if (width > height) {
            height = Math.round((height * maxDim) / width);
            width = maxDim;
          } else {
            width = Math.round((width * maxDim) / height);
            height = maxDim;
          }
        }

        const canvas = document.createElement("canvas");
        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const dataUrl = canvas.toDataURL("image/jpeg", 0.75);
          setFormData(prev => ({ ...prev, image: dataUrl }));
        }
      };
    };
    reader.readAsDataURL(file);
  };

  return (
    <div className="min-h-screen">
      {/* Top Bar */}
      <header className="glass-light sticky top-0 z-30 backdrop-blur-md px-6 py-4 flex items-center justify-between border-b border-slate-800/50">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-amber-600 to-red-500 flex items-center justify-center shadow-lg shadow-amber-500/20 text-lg">
            🔐
          </div>
          <div>
            <h1 className="text-lg font-extrabold text-white leading-none">Admin Dashboard</h1>
            <p className="text-[10px] text-slate-500 uppercase tracking-wider font-bold mt-0.5">ABR Asma Restaurant</p>
          </div>
        </div>
        <div className="flex items-center gap-3">
          {actionPending && (
            <span className="flex items-center gap-1.5 text-xs text-amber-400 font-medium animate-pulse">
              <CircleNotch className="w-3.5 h-3.5 animate-spin" /> Syncing...
            </span>
          )}
          {!actionPending && (
            <span className="hidden sm:inline-flex items-center gap-1.5 text-[11px] font-semibold text-emerald-400 bg-emerald-950/60 border border-emerald-800/40 px-2.5 py-1 rounded-full">
              <span className={`w-1.5 h-1.5 rounded-full ${realtimeStatus === 'connected' ? 'bg-emerald-400 animate-pulse' : 'bg-slate-500'}`} />
              <CloudCheck className="w-3.5 h-3.5" weight="bold" /> Supabase
            </span>
          )}
          <button
            type="button"
            onClick={toggleAudioAlerts}
            title={audioEnabled ? "Order sound alarms are active. Click to mute." : "Click to enable order sound alarms"}
            className={`text-xs px-2.5 py-1.5 rounded-lg flex items-center gap-1.5 font-semibold transition-smooth border ${
              audioEnabled
                ? "bg-amber-500/15 border-amber-500/40 text-amber-400 hover:bg-amber-500/25"
                : "glass border-slate-800 text-slate-400 hover:text-white"
            }`}
          >
            {audioEnabled ? (
              <>
                <SpeakerHigh className="w-3.5 h-3.5 text-amber-400 animate-pulse" weight="bold" />
                <span className="hidden sm:inline">Alerts On</span>
              </>
            ) : (
              <>
                <SpeakerSlash className="w-3.5 h-3.5 text-slate-400" weight="bold" />
                <span className="hidden sm:inline">Enable Alerts</span>
              </>
            )}
          </button>
          <span className="text-xs text-slate-400 hidden md:inline">Signed in as <span className="text-amber-400 font-bold">{userEmail || 'admin'}</span></span>
          <button onClick={handleLogout} className="btn-secondary text-xs px-4 py-2 flex items-center gap-2">
            <SignOut className="w-4 h-4" weight="bold" />
            Logout
          </button>
        </div>
      </header>

      {/* Tab Navigation */}
      <div className="px-6 py-4 flex items-center gap-2 border-b border-slate-800/30 overflow-x-auto">
        {tabs.map(tab => (
          <button
            key={tab.id}
            onClick={() => setActiveTab(tab.id)}
            className={`px-5 py-3 rounded-xl text-sm font-bold whitespace-nowrap transition-smooth flex items-center gap-2 ${
              activeTab === tab.id
                ? 'bg-amber-500 text-slate-950'
                : 'glass text-slate-400 hover:text-white border border-slate-800'
            }`}
          >
            <span>{tab.icon}</span>
            {tab.label}
            <span className={`text-[10px] px-1.5 py-0.5 rounded-full font-extrabold ${
              activeTab === tab.id ? 'bg-slate-950/20 text-slate-950' : 'bg-slate-800 text-slate-400'
            }`}>{tab.count}</span>
          </button>
        ))}
      </div>

      {actionError && (
        <div className="max-w-6xl mx-auto px-6 pt-4">
          <div className="bg-red-950/70 border border-red-800/60 rounded-xl p-3.5 flex items-center justify-between text-red-200 text-xs">
            <div className="flex items-center gap-2">
              <WarningCircle className="w-4 h-4 text-red-400 shrink-0" weight="bold" />
              <span>{actionError}</span>
            </div>
            <button onClick={() => setActionError(null)} className="text-red-400 hover:text-white ml-3">
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}

      {loading && (
        <div className="max-w-6xl mx-auto p-12 text-center">
          <div className="inline-flex items-center gap-3 px-5 py-3 rounded-2xl glass border border-amber-500/20 text-amber-400 text-sm font-semibold">
            <CircleNotch className="w-5 h-5 animate-spin" />
            Loading details from Supabase...
          </div>
        </div>
      )}

      <div className="max-w-6xl mx-auto p-6">
        {/* ====== MENU ITEMS TAB ====== */}
        {activeTab === 'menu' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-xl font-extrabold text-white">Supermarket Products & Inventory</h2>
                <p className="text-xs text-slate-400 mt-1">Manage grocery items, prices, and stock categories stored locally</p>
              </div>
              <button
                onClick={() => { resetForm(); setShowAddForm(true); }}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-tr from-emerald-600 to-teal-500 text-white font-bold text-sm flex items-center gap-2 hover:from-emerald-500 hover:to-teal-400 transition-smooth shadow-lg shadow-emerald-500/20"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                Add Product
              </button>
            </div>

            {/* Add/Edit Form */}
            {(showAddForm || editingItem) && (
              <div className="glass rounded-2xl p-6 mb-6 border border-emerald-500/20 animate-fadeIn">
                <h3 className="font-bold text-white text-base mb-4">{editingItem ? 'Edit Product Item' : 'Add New Product Item'}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Product Name</label>
                    <input value={formData.name} onChange={e => setFormData({...formData, name: e.target.value})} placeholder="e.g. Farm Fresh Tomatoes (1 kg)" className="text-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Price (₹)</label>
                    <input type="number" step="0.01" value={formData.price} onChange={e => setFormData({...formData, price: e.target.value})} placeholder="0.00" className="text-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Category</label>
                    <select value={formData.category} onChange={e => setFormData({...formData, category: e.target.value as MenuItem['category']})} className="text-sm">
                      <option value="fruits-vegetables">🥦 Fruits & Vegetables</option>
                      <option value="dairy-bakery">🥛 Dairy & Bakery</option>
                      <option value="groceries-staples">🌾 Groceries & Daily Staples</option>
                      <option value="snacks-beverages">🍪 Snacks & Beverages</option>
                      <option value="household-essentials">🧼 Household Essentials</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Image Upload / URL</label>
                    <div className="flex gap-2 items-center">
                      <label className="flex items-center gap-1.5 px-3 py-2 bg-slate-800 hover:bg-slate-700 text-xs font-bold text-amber-400 rounded-xl cursor-pointer border border-slate-700 whitespace-nowrap transition-smooth">
                        <Upload className="w-4 h-4" /> Upload Image
                        <input type="file" accept="image/*" onChange={handleImageFileChange} className="hidden" />
                      </label>
                      <input 
                        value={formData.image} 
                        onChange={e => setFormData({...formData, image: e.target.value})} 
                        placeholder="Or enter image URL..." 
                        className="text-xs flex-1" 
                      />
                    </div>
                    {formData.image && (
                      <div className="mt-2 flex items-center gap-2">
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img src={formData.image} alt="Preview" className="w-10 h-10 object-cover rounded-lg border border-slate-700" />
                        <span className="text-[10px] text-green-400 font-semibold flex items-center gap-1"><CheckCircle className="w-3.5 h-3.5" /> Image set</span>
                        <button type="button" onClick={() => setFormData({...formData, image: ''})} className="text-[10px] text-slate-400 hover:text-red-400 ml-auto">Clear</button>
                      </div>
                    )}
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Description</label>
                    <textarea value={formData.description} onChange={e => setFormData({...formData, description: e.target.value})} placeholder="Dish description" rows={2} className="text-sm bg-surface-800/50 border border-surface-700 text-surface-100 rounded-xl px-4 py-3 w-full focus:outline-none focus:ring-2 focus:ring-primary-500/50 focus:border-primary-500 transition-smooth placeholder:text-surface-500" />
                  </div>
                </div>
                <div className="flex gap-3 justify-end mt-4">
                  <button onClick={resetForm} className="btn-secondary text-xs px-4 py-2">Cancel</button>
                  <button
                    onClick={editingItem ? handleUpdateItem : handleAddItem}
                    className="px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs hover:bg-amber-400 transition-smooth"
                  >
                    {editingItem ? 'Update Item' : 'Add Item'}
                  </button>
                </div>
              </div>
            )}

            {/* Menu Items Grid */}
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {menuItems.map(item => (
                <div key={item.id} className="glass rounded-2xl overflow-hidden border border-slate-800 hover:border-slate-700/60 transition-smooth group flex flex-col">
                  {/* Thumbnail Image display */}
                  <div className="h-36 w-full relative bg-slate-900 overflow-hidden flex items-center justify-center border-b border-slate-800">
                    {item.image ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-smooth" />
                    ) : (
                      <div className="text-center p-4 flex flex-col items-center">
                        <ForkKnife className="w-8 h-8 text-slate-700" />
                        <p className="text-[10px] text-slate-500 uppercase font-bold mt-1">No Image</p>
                      </div>
                    )}
                    <span className="absolute top-2 left-2 px-2.5 py-1 rounded-md bg-slate-950/80 backdrop-blur-md text-[9px] uppercase font-bold text-amber-400 border border-slate-800">
                      {item.category}
                    </span>
                  </div>

                  <div className="p-5 flex-1 flex flex-col justify-between">
                    <div>
                      <div className="flex items-start justify-between mb-1.5">
                        <h4 className="font-bold text-white text-sm truncate flex-1">{item.name}</h4>
                        <span className="text-amber-400 font-extrabold text-base ml-2">₹{item.price.toFixed(2)}</span>
                      </div>
                      <p className="text-xs text-slate-400 line-clamp-2 mb-4">{item.description}</p>
                    </div>

                    <div className="flex items-center gap-2 pt-3 border-t border-slate-800/40">
                      <button onClick={() => handleEditItem(item.id)} className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold text-slate-300 hover:text-amber-400 p-2.5 rounded-lg hover:bg-slate-800/50 transition-smooth">
                        <PencilSimple className="w-4 h-4" /> Edit
                      </button>
                      <button onClick={() => handleDeleteItem(item.id)} className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold text-slate-400 hover:text-red-400 p-2.5 rounded-lg hover:bg-red-500/10 transition-smooth">
                        <Trash className="w-4 h-4" /> Delete
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>

            {menuItems.length === 0 && (
              <div className="text-center py-20 text-slate-500">
                <p className="text-sm font-semibold">No menu items yet</p>
                <p className="text-xs mt-1">Add your first menu item to get started.</p>
              </div>
            )}
          </div>
        )}

        {/* ====== ENQUIRIES TAB ====== */}
        {activeTab === 'enquiries' && (
          <div>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-xl font-extrabold text-white">Customer Enquiries</h2>
              {enquiries.length > 0 && (
                <button onClick={handleClearEnquiries} className="btn-danger text-xs px-4 py-2 flex items-center gap-2">
                  <Trash className="w-4 h-4" /> Clear All
                </button>
              )}
            </div>

            {/* Status Filter Bar */}
            {enquiries.length > 0 && (
              <div className="flex flex-wrap gap-2 mb-5">
                <button
                  onClick={() => setStatusFilter('all')}
                  className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-smooth border ${
                    statusFilter === 'all'
                      ? 'bg-white/10 border-white/20 text-white'
                      : 'glass border-slate-800 text-slate-400 hover:text-white'
                  }`}
                >
                  All ({enquiries.length})
                </button>
                {(Object.keys(ORDER_STATUS_CONFIG) as OrderStatus[]).map(status => {
                  const config = ORDER_STATUS_CONFIG[status];
                  const count = enquiries.filter(e => (e.status || 'pending') === status).length;
                  if (count === 0) return null;
                  return (
                    <button
                      key={status}
                      onClick={() => setStatusFilter(status)}
                      className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-smooth border ${
                        statusFilter === status
                          ? `bg-${config.color}-500/20 border-${config.color}-500/40 text-${config.color}-400`
                          : 'glass border-slate-800 text-slate-400 hover:text-white'
                      }`}
                    >
                      {config.label} ({count})
                    </button>
                  );
                })}
              </div>
            )}

            {enquiries.length === 0 ? (
              <div className="text-center py-20 text-slate-500 glass rounded-2xl flex flex-col items-center">
                <NewspaperClipping className="w-12 h-12 mb-3 text-slate-700" />
                <p className="text-sm font-semibold">No enquiries yet</p>
                <p className="text-xs mt-1">Customer enquiries will appear here when they place orders via WhatsApp.</p>
              </div>
            ) : filteredEnquiries.length === 0 ? (
              <div className="text-center py-12 text-slate-500 glass rounded-2xl flex flex-col items-center">
                <MagnifyingGlass className="w-8 h-8 mb-2 text-slate-700" />
                <p className="text-sm font-semibold">No orders with this status</p>
                <button onClick={() => setStatusFilter('all')} className="text-xs text-amber-400 hover:underline mt-2">Show all orders</button>
              </div>
            ) : (
              <div className="space-y-3">
                {filteredEnquiries.map(enq => {
                  const currentStatus = enq.status || 'pending';
                  const statusConfig = ORDER_STATUS_CONFIG[currentStatus];

                  // Dynamic badge colors using inline styles for reliability
                  const badgeColors: Record<string, { bg: string; text: string; border: string }> = {
                    amber:   { bg: 'rgba(245,158,11,0.15)', text: '#fbbf24', border: 'rgba(245,158,11,0.3)' },
                    blue:    { bg: 'rgba(59,130,246,0.15)',  text: '#60a5fa', border: 'rgba(59,130,246,0.3)' },
                    purple:  { bg: 'rgba(168,85,247,0.15)',  text: '#c084fc', border: 'rgba(168,85,247,0.3)' },
                    orange:  { bg: 'rgba(249,115,22,0.15)',  text: '#fb923c', border: 'rgba(249,115,22,0.3)' },
                    emerald: { bg: 'rgba(16,185,129,0.15)',  text: '#34d399', border: 'rgba(16,185,129,0.3)' },
                    red:     { bg: 'rgba(239,68,68,0.15)',   text: '#f87171', border: 'rgba(239,68,68,0.3)' },
                  };
                  const bc = badgeColors[statusConfig.color] || badgeColors.amber;

                  return (
                    <div key={enq.id} className="glass rounded-2xl p-5 border border-slate-800 hover:border-slate-700/60 transition-smooth">
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          {/* Header Row: Order ID, Name, Phone, Status Badge */}
                          <div className="flex items-center gap-3 mb-3 flex-wrap">
                            {enq.orderId && (
                              <span className="px-2 py-0.5 rounded bg-amber-500/10 text-amber-400 font-mono font-bold text-xs border border-amber-500/30">
                                #{enq.orderId}
                              </span>
                            )}
                            <span className="font-extrabold text-white">{enq.customerName}</span>
                            <a href={`tel:${enq.customerPhone}`} className="text-xs text-amber-400 font-bold hover:underline flex items-center gap-1"><Phone className="w-3.5 h-3.5" weight="fill" /> {enq.customerPhone}</a>
                            
                            {/* Status Badge */}
                            <span
                              className="px-2.5 py-1 rounded-full font-bold text-[10px] uppercase tracking-wider border ml-auto"
                              style={{ backgroundColor: bc.bg, color: bc.text, borderColor: bc.border }}
                            >
                              {statusConfig.label}
                            </span>
                          </div>

                          {/* Delivery Address */}
                          {enq.deliveryAddress && (
                            <div className="mb-2 p-2.5 rounded-xl bg-slate-900/60 border border-slate-800/80 text-xs">
                              <span className="text-amber-500 font-bold inline-flex items-center gap-1 px-1"><HouseLine className="w-4 h-4" /> Delivery: </span>
                              <span className="text-slate-200">{enq.deliveryAddress}</span>
                              {enq.deliveryLandmark && (
                                <span className="text-slate-400"> (Landmark: {enq.deliveryLandmark})</span>
                              )}
                              {enq.deliveryNotes && (
                                <div className="text-slate-400 mt-1 italic">Note: {enq.deliveryNotes}</div>
                              )}
                            </div>
                          )}

                          <p className="text-sm text-slate-300 mb-3">{enq.items}</p>

                          {/* Bottom Row: Qty, Price, Date, Status Dropdown */}
                          <div className="flex items-center gap-4 text-xs text-slate-500 flex-wrap">
                            <span>Qty: {enq.totalQuantity}</span>
                            <span className="font-bold text-amber-400/80">₹{enq.totalPrice.toFixed(2)}</span>
                            <span>{new Date(enq.createdAt).toLocaleString()}</span>

                            {/* Status Dropdown */}
                            <div className="ml-auto flex items-center gap-2">
                              <label className="text-[10px] uppercase font-bold text-slate-500 tracking-wider">Status:</label>
                              <select
                                value={currentStatus}
                                onChange={(e) => handleStatusChange(enq.id, e.target.value as OrderStatus)}
                                className="px-2.5 py-1.5 rounded-lg text-xs font-bold bg-slate-800 border border-slate-700 text-white focus:outline-none focus:border-amber-500 transition-smooth cursor-pointer"
                              >
                                {(Object.keys(ORDER_STATUS_CONFIG) as OrderStatus[]).map(s => (
                                  <option key={s} value={s}>{ORDER_STATUS_CONFIG[s].label}</option>
                                ))}
                              </select>
                            </div>
                          </div>
                        </div>

                        <button onClick={() => handleDeleteEnquiry(enq.id)} className="text-slate-500 hover:text-red-400 p-2 rounded-lg hover:bg-red-500/10 transition-smooth shrink-0">
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2}><path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" /></svg>
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* ====== OFFERS TAB ====== */}
        {activeTab === 'offers' && (
          <div>
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-extrabold text-white">Offer Management</h2>
              <button
                onClick={() => { resetOfferForm(); setShowAddOffer(true); }}
                className="px-4 py-2.5 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-500 text-slate-950 font-bold text-sm flex items-center gap-2 hover:from-amber-500 hover:to-amber-400 transition-smooth shadow-lg shadow-amber-500/20"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth={2.5}><path strokeLinecap="round" strokeLinejoin="round" d="M12 4v16m8-8H4" /></svg>
                Add Offer
              </button>
            </div>

            {/* Product Search Bar */}
            <div className="relative mb-6">
              <div className="relative flex items-center">
                <MagnifyingGlass className="absolute left-4 w-4 h-4 text-slate-400 pointer-events-none" />
                <input
                  type="text"
                  value={offerProductSearch}
                  onChange={(e) => setOfferProductSearch(e.target.value)}
                  placeholder="Search products to make an offer..."
                  className="w-full pl-11 pr-10 py-3 rounded-xl bg-slate-900/80 border border-slate-800 text-sm text-white placeholder-slate-500 focus:outline-none focus:border-amber-500 transition-smooth"
                />
                {offerProductSearch && (
                  <button
                    type="button"
                    onClick={() => setOfferProductSearch('')}
                    className="absolute right-3 p-1.5 text-slate-400 hover:text-white rounded-lg transition-smooth"
                    aria-label="Clear search"
                  >
                    <X className="w-4 h-4" />
                  </button>
                )}
              </div>
            </div>

            {/* Add/Edit Offer Form */}
            {(showAddOffer || editingOffer) && (
              <div ref={offerFormRef} className="glass rounded-2xl p-6 mb-6 border border-amber-500/20 animate-fadeIn">
                <h3 className="font-bold text-white text-base mb-4">{editingOffer ? 'Edit Offer' : 'Create New Offer'}</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Offer Title</label>
                    <input value={offerForm.title} onChange={e => setOfferForm({...offerForm, title: e.target.value})} placeholder="e.g. 20% OFF on Biriyani!" className="text-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Description</label>
                    <input value={offerForm.description} onChange={e => setOfferForm({...offerForm, description: e.target.value})} placeholder="Offer details" className="text-sm" />
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">Discount Type</label>
                    <select value={offerForm.discountType} onChange={e => setOfferForm({...offerForm, discountType: e.target.value as Offer['discountType']})} className="text-sm">
                      <option value="percentage">Percentage (%)</option>
                      <option value="flat">Flat Amount (₹)</option>
                    </select>
                  </div>
                  <div>
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      {offerForm.discountType === 'percentage' ? 'Discount %' : 'Discount Amount (₹)'}
                    </label>
                    <input type="number" step="0.01" value={offerForm.discountValue} onChange={e => setOfferForm({...offerForm, discountValue: e.target.value})} placeholder="0" className="text-sm" />
                  </div>
                  <div className="md:col-span-2">
                    <label className="block text-[10px] font-bold text-slate-400 uppercase tracking-widest mb-1.5">
                      Applicable Products <span className="text-slate-600">(leave empty = all products)</span>
                    </label>
                    <div className="flex flex-wrap gap-2 mt-2">
                      {menuItems.map(item => (
                        <button
                          key={item.id}
                          type="button"
                          onClick={() => handleToggleProduct(item.id)}
                          className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-smooth border ${
                            offerForm.applicableProducts.includes(item.id)
                              ? 'bg-amber-500 text-slate-950 border-amber-500'
                              : 'glass border-slate-800 text-slate-400 hover:text-white'
                          }`}
                        >
                          {item.name}
                        </button>
                      ))}
                    </div>
                  </div>
                  <div className="md:col-span-2 flex items-center gap-3">
                    <label className="text-[10px] font-bold text-slate-400 uppercase tracking-widest">Active</label>
                    <button
                      type="button"
                      onClick={() => setOfferForm({...offerForm, active: !offerForm.active})}
                      className={`relative w-12 h-6 rounded-full transition-smooth ${offerForm.active ? 'bg-amber-500' : 'bg-slate-700'}`}
                    >
                      <span className={`absolute top-0.5 w-5 h-5 rounded-full bg-white shadow transition-smooth ${offerForm.active ? 'left-6' : 'left-0.5'}`} />
                    </button>
                    <span className="text-xs text-slate-400">{offerForm.active ? 'Active' : 'Inactive'}</span>
                  </div>
                </div>
                <div className="flex gap-3 justify-end mt-4">
                  <button onClick={resetOfferForm} className="btn-secondary text-xs px-4 py-2">Cancel</button>
                  <button
                    onClick={editingOffer ? handleUpdateOffer : handleAddOffer}
                    className="px-4 py-2 bg-amber-500 text-slate-950 font-bold rounded-xl text-xs hover:bg-amber-400 transition-smooth"
                  >
                    {editingOffer ? 'Update Offer' : 'Create Offer'}
                  </button>
                </div>
              </div>
            )}

            {/* Matching Products (Search Active) or Existing Offers List */}
            {offerProductSearch.trim() ? (
              <div>
                {(() => {
                  const query = offerProductSearch.trim().toLowerCase();
                  const matchingProducts = menuItems.filter(item => {
                    const nameMatch = item.name?.toLowerCase().includes(query);
                    const catMatch = item.category ? item.category.toLowerCase().includes(query) : false;
                    const idMatch = item.id?.toLowerCase().includes(query);
                    const descMatch = item.description ? item.description.toLowerCase().includes(query) : false;
                    const brandMatch = (item as any).brand ? String((item as any).brand).toLowerCase().includes(query) : false;
                    return nameMatch || catMatch || idMatch || descMatch || brandMatch;
                  });

                  if (matchingProducts.length === 0) {
                    return (
                      <div className="text-center py-16 text-slate-500 glass rounded-2xl flex flex-col items-center">
                        <MagnifyingGlass className="w-10 h-10 mb-3 text-slate-700" />
                        <p className="text-sm font-semibold">No products found.</p>
                        <button
                          type="button"
                          onClick={() => setOfferProductSearch('')}
                          className="text-xs text-amber-400 hover:underline mt-2"
                        >
                          Clear search
                        </button>
                      </div>
                    );
                  }

                  return (
                    <div className="space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-xs font-bold text-slate-400 uppercase tracking-wider">
                          Matching Products ({matchingProducts.length})
                        </h3>
                        <button
                          type="button"
                          onClick={() => setOfferProductSearch('')}
                          className="text-xs text-slate-400 hover:text-amber-400 transition-smooth"
                        >
                          Show All Offers
                        </button>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                        {matchingProducts.map(item => {
                          const existingOffer = offers.find(o => o.applicableProducts.includes(item.id));
                          const isSelectedInForm = (showAddOffer || editingOffer) && offerForm.applicableProducts.includes(item.id);

                          return (
                            <div
                              key={item.id}
                              className={`glass rounded-2xl overflow-hidden border transition-smooth group flex flex-col ${
                                isSelectedInForm
                                  ? 'border-amber-500/60 ring-1 ring-amber-500/30'
                                  : 'border-slate-800 hover:border-slate-700/60'
                              }`}
                            >
                              {/* Thumbnail Image display */}
                              <div className="h-36 w-full relative bg-slate-900 overflow-hidden flex items-center justify-center border-b border-slate-800">
                                {item.image ? (
                                  // eslint-disable-next-line @next/next/no-img-element
                                  <img src={item.image} alt={item.name} className="w-full h-full object-cover group-hover:scale-105 transition-smooth" />
                                ) : (
                                  <div className="text-center p-4 flex flex-col items-center">
                                    <ForkKnife className="w-8 h-8 text-slate-700" />
                                    <p className="text-[10px] text-slate-500 uppercase font-bold mt-1">No Image</p>
                                  </div>
                                )}
                                <span className="absolute top-2 left-2 px-2.5 py-1 rounded-md bg-slate-950/80 backdrop-blur-md text-[9px] uppercase font-bold text-amber-400 border border-slate-800">
                                  {item.category}
                                </span>
                                {existingOffer && (
                                  <span className="absolute top-2 right-2 px-2.5 py-1 rounded-md bg-emerald-950/90 backdrop-blur-md text-[9px] uppercase font-extrabold text-emerald-400 border border-emerald-500/40 flex items-center gap-1">
                                    <Tag className="w-3 h-3" weight="fill" />
                                    {existingOffer.discountType === 'percentage' ? `${existingOffer.discountValue}% OFF` : `₹${existingOffer.discountValue} OFF`}
                                  </span>
                                )}
                              </div>

                              <div className="p-5 flex-1 flex flex-col justify-between">
                                <div>
                                  <div className="flex items-start justify-between mb-1.5">
                                    <h4 className="font-bold text-white text-sm truncate flex-1">{item.name}</h4>
                                    <span className="text-amber-400 font-extrabold text-base ml-2">₹{item.price.toFixed(2)}</span>
                                  </div>
                                  <p className="text-xs text-slate-400 line-clamp-2 mb-3">{item.description}</p>
                                  {existingOffer && (
                                    <p className="text-[11px] text-emerald-400/90 mb-3 bg-emerald-500/10 rounded-lg px-2.5 py-1 border border-emerald-500/20 truncate">
                                      Active Offer: <span className="font-bold text-white">{existingOffer.title}</span>
                                    </p>
                                  )}
                                </div>

                                <div className="flex items-center gap-2 pt-3 border-t border-slate-800/40">
                                  {existingOffer ? (
                                    <button
                                      type="button"
                                      onClick={() => handleSelectProductForOffer(item, existingOffer)}
                                      className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold px-3 py-2.5 rounded-xl bg-amber-500/15 text-amber-400 hover:bg-amber-500 hover:text-slate-950 border border-amber-500/30 transition-smooth"
                                    >
                                      <PencilSimple className="w-4 h-4" /> Edit Offer
                                    </button>
                                  ) : (
                                    <button
                                      type="button"
                                      onClick={() => handleSelectProductForOffer(item)}
                                      className="flex-1 flex items-center justify-center gap-1.5 text-xs font-bold px-3 py-2.5 rounded-xl bg-gradient-to-tr from-amber-600 to-amber-500 text-slate-950 hover:from-amber-500 hover:to-amber-400 transition-smooth shadow-sm shadow-amber-500/20"
                                    >
                                      <Tag className="w-4 h-4" weight="fill" /> Make Offer
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  );
                })()}
              </div>
            ) : (
              /* Offers List */
              offers.length === 0 ? (
                <div className="text-center py-20 text-slate-500 glass rounded-2xl flex flex-col items-center">
                  <Tag className="w-12 h-12 mb-3 text-slate-700" />
                  <p className="text-sm font-semibold">No offers yet</p>
                  <p className="text-xs mt-1">Create offers to display on the website and apply discounts to products.</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {offers.map(offer => (
                    <div key={offer.id} className={`glass rounded-2xl p-5 border transition-smooth ${offer.active ? 'border-amber-500/30' : 'border-slate-800 opacity-60'}`}>
                      <div className="flex items-start justify-between gap-4">
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center gap-3 mb-1">
                            <h4 className="font-extrabold text-white">{offer.title}</h4>
                            <span className={`text-[10px] px-2 py-0.5 rounded-full font-bold ${offer.active ? 'bg-green-500/20 text-green-400' : 'bg-slate-700 text-slate-400'}`}>
                              {offer.active ? 'ACTIVE' : 'INACTIVE'}
                            </span>
                          </div>
                          <p className="text-sm text-slate-400 mb-2">{offer.description}</p>
                          <div className="flex items-center gap-4 text-xs text-slate-500">
                            <span className="font-bold text-amber-400/80">
                              {offer.discountType === 'percentage' ? `${offer.discountValue}% OFF` : `₹${offer.discountValue} OFF`}
                            </span>
                            <span>
                              {offer.applicableProducts.length === 0
                                ? 'All Products'
                                : `${offer.applicableProducts.length} product(s)`
                              }
                            </span>
                          </div>
                        </div>
                        <div className="flex items-center gap-2 shrink-0">
                          <button onClick={() => toggleOfferActive(offer.id)} className={`p-2.5 rounded-lg transition-smooth ${offer.active ? 'text-green-400 hover:bg-green-500/10' : 'text-slate-500 hover:bg-slate-800'}`} aria-label="Toggle active">
                            {offer.active ? <CheckCircle className="w-4 h-4" weight="fill" /> : <PauseCircle className="w-4 h-4" weight="fill" />}
                          </button>
                          <button onClick={() => handleEditOffer(offer.id)} className="text-slate-400 hover:text-amber-400 p-2.5 rounded-lg hover:bg-slate-800/50 transition-smooth" aria-label="Edit">
                            <PencilSimple className="w-4 h-4" />
                          </button>
                          <button onClick={() => handleDeleteOffer(offer.id)} className="text-slate-500 hover:text-red-400 p-2.5 rounded-lg hover:bg-red-500/10 transition-smooth" aria-label="Delete">
                            <Trash className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )
            )}
          </div>
        )}


      </div>

      {/* Realtime New Order Notification Toast Banner */}
      {latestOrderNotification && (
        <div
          role="alert"
          aria-live="assertive"
          className="fixed top-20 right-6 z-50 max-w-sm w-[calc(100%-3rem)] bg-slate-900/95 border border-amber-500/60 shadow-2xl shadow-amber-500/10 rounded-2xl p-4 backdrop-blur-xl animate-in fade-in slide-in-from-top-4 duration-300"
        >
          <div className="flex items-start gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/20 border border-amber-500/40 flex items-center justify-center flex-shrink-0 text-amber-400">
              <BellRinging className="w-5 h-5 animate-bounce" weight="fill" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center justify-between">
                <span className="text-[10px] font-extrabold uppercase tracking-wider text-amber-400">New Order Received!</span>
                <span className="text-[10px] text-slate-500 font-mono">Just now</span>
              </div>
              <p className="text-sm font-bold text-white truncate mt-0.5">{latestOrderNotification.orderId || 'Order'}</p>
              <p className="text-xs text-slate-300 mt-0.5 truncate">
                {latestOrderNotification.customerName} • <span className="text-amber-400 font-semibold">₹{latestOrderNotification.totalPrice.toFixed(2)}</span>
              </p>
              <p className="text-[11px] text-slate-400 truncate mt-1">{latestOrderNotification.items}</p>
              <div className="flex items-center gap-2 mt-3 pt-2 border-t border-slate-800">
                <button
                  type="button"
                  onClick={() => {
                    setActiveTab('enquiries');
                    setLatestOrderNotification(null);
                  }}
                  className="px-3 py-1.5 rounded-lg bg-amber-500 hover:bg-amber-400 text-slate-950 text-xs font-bold transition-smooth"
                >
                  View Order
                </button>
                <button
                  type="button"
                  onClick={() => setLatestOrderNotification(null)}
                  className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-300 text-xs font-medium transition-smooth"
                >
                  Acknowledge
                </button>
              </div>
            </div>
            <button
              type="button"
              onClick={() => setLatestOrderNotification(null)}
              className="text-slate-500 hover:text-white transition-colors p-1"
              aria-label="Close notification"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
