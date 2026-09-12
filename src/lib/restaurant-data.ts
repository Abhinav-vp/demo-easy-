export type ProductCategory =
  | 'fruits-vegetables'
  | 'dairy-bakery'
  | 'groceries-staples'
  | 'snacks-beverages'
  | 'household-essentials';

export interface MenuItem {
  id: string;
  name: string;
  category: ProductCategory | string;
  price: number;
  originalPrice?: number;
  description: string;
  image?: string;
}

export interface Review {
  id: string;
  author: string;
  rating: number;
  comment: string;
  date: string;
}

export interface Offer {
  id: string;
  title: string;
  description: string;
  discountType: 'percentage' | 'flat';
  discountValue: number;
  applicableProducts: string[]; // product IDs, empty = all products
  active: boolean;
  createdAt: string;
}


export interface EnquiryItemDetail {
  name: string;
  quantity: number;
  unitPrice: number;
  lineTotal: number;
}

export type OrderStatus = 'pending' | 'confirmed' | 'preparing' | 'out_for_delivery' | 'delivered' | 'cancelled';

export const ORDER_STATUS_CONFIG: Record<OrderStatus, { label: string; color: string }> = {
  pending:          { label: 'Pending',          color: 'amber' },
  confirmed:        { label: 'Confirmed',        color: 'blue' },
  preparing:        { label: 'Packing Order',    color: 'purple' },
  out_for_delivery: { label: 'Out for Delivery', color: 'orange' },
  delivered:        { label: 'Delivered',         color: 'emerald' },
  cancelled:        { label: 'Cancelled',        color: 'red' },
};

export interface Enquiry {
  id: string;
  orderId?: string;
  status?: OrderStatus;
  customerName: string;
  customerPhone: string;
  deliveryAddress?: string;
  deliveryLandmark?: string;
  deliveryNotes?: string;
  items: string;
  itemDetails?: EnquiryItemDetail[];
  subtotalPrice?: number;
  totalQuantity: number;
  totalPrice: number;
  createdAt: string;
}

// Generate unique order ID in format ORD-YYMMDD-XXXX
export function generateOrderId(): string {
  const now = new Date();
  const yy = String(now.getFullYear()).slice(2);
  const mm = String(now.getMonth() + 1).padStart(2, '0');
  const dd = String(now.getDate()).padStart(2, '0');
  const rand = Math.floor(1000 + Math.random() * 9000);
  return `ORD-${yy}${mm}${dd}-${rand}`;
}

// Format structured WhatsApp order message for Easy Mart Supermarket
export function formatWhatsAppOrderMessage(params: {
  orderId: string;
  customerName: string;
  customerPhone: string;
  deliveryAddress: string;
  deliveryLandmark?: string;
  deliveryNotes?: string;
  cartItems: { name: string; quantity: number; unitPrice: number }[];
  subtotal: number;
  finalTotal: number;
}): string {
  const {
    orderId, customerName, customerPhone,
    deliveryAddress, deliveryLandmark, deliveryNotes,
    cartItems, subtotal, finalTotal,
  } = params;

  let msg = `🛒 *NEW GROCERY ORDER — Easy Mart Supermarket*\n`;
  msg += `📍 *Order ID:* #${orderId}\n`;
  msg += `--------------------------------\n`;
  msg += `👤 *Customer Name:* ${customerName}\n`;
  msg += `📞 *Customer Phone:* ${customerPhone}\n`;
  msg += `🏡 *Delivery Address:* ${deliveryAddress}`;
  if (deliveryLandmark) msg += ` (Landmark: ${deliveryLandmark})`;
  msg += `\n`;
  if (deliveryNotes) msg += `📝 *Notes:* ${deliveryNotes}\n`;

  msg += `\n🛍️ *ORDER ITEMS:*\n`;
  cartItems.forEach(item => {
    msg += `• ${item.quantity}x ${item.name} — ₹${(item.unitPrice * item.quantity).toFixed(2)}\n`;
  });

  msg += `\n--------------------------------\n`;
  msg += `💵 Subtotal: ₹${subtotal.toFixed(2)}\n`;
  msg += `💰 *TOTAL AMOUNT: ₹${finalTotal.toFixed(2)}*\n`;
  msg += `--------------------------------\n`;
  msg += `📍 Store: Easy Mart Supermarket, Pallikkuni\n`;
  msg += `Please confirm my grocery delivery. Thank you!`;

  return msg;
}

export const MENU_ITEMS: MenuItem[] = [
  // 1. Fresh Fruits & Vegetables
  {
    id: "em-fv-1",
    name: "Farm Fresh Vine Tomatoes (1 kg)",
    category: "fruits-vegetables",
    price: 38,
    originalPrice: 48,
    description: "Crisp, locally sourced juicy red tomatoes, hand-picked daily for optimum freshness.",
    image: "/fresh_produce.jpg"
  },
  {
    id: "em-fv-2",
    name: "Fresh Big Onions / Savola (1 kg)",
    category: "fruits-vegetables",
    price: 42,
    originalPrice: 50,
    description: "Premium quality cleaned onions, essential staple for everyday Kerala home cooking.",
    image: "/fresh_produce.jpg"
  },
  {
    id: "em-fv-3",
    name: "Farm Fresh Potatoes (1 kg)",
    category: "fruits-vegetables",
    price: 34,
    description: "Firm, clean cooking potatoes perfect for curries, fries, and side dishes.",
    image: "/fresh_produce.jpg"
  },
  {
    id: "em-fv-4",
    name: "Kerala Robusta Bananas (1 kg)",
    category: "fruits-vegetables",
    price: 46,
    originalPrice: 55,
    description: "Naturally sweet and wholesome bananas direct from local Kerala fruit orchards.",
    image: "/fresh_produce.jpg"
  },
  {
    id: "em-fv-5",
    name: "Crisp Royal Gala Apples (1 kg)",
    category: "fruits-vegetables",
    price: 165,
    originalPrice: 190,
    description: "Sweet, crunchy imported apples packed with healthy antioxidants and vitamins.",
    image: "/fresh_produce.jpg"
  },

  // 2. Dairy & Bakery
  {
    id: "em-db-1",
    name: "Milma Rich Pasteurized Milk (500 ml)",
    category: "dairy-bakery",
    price: 28,
    description: "Fresh chilled daily milk sachet rich in calcium and natural proteins.",
    image: "/easy_mart_hero.jpg"
  },
  {
    id: "em-db-2",
    name: "Amul Fresh Malai Paneer (200 g)",
    category: "dairy-bakery",
    price: 95,
    originalPrice: 110,
    description: "Soft, wholesome cottage cheese cubes perfect for delicious gravies and snacks.",
    image: "/easy_mart_hero.jpg"
  },
  {
    id: "em-db-3",
    name: "Modern Sliced Milk Bread (400 g)",
    category: "dairy-bakery",
    price: 45,
    description: "Freshly baked soft white sandwich bread, delivered daily to the supermarket.",
    image: "/easy_mart_hero.jpg"
  },
  {
    id: "em-db-4",
    name: "Amul Butter Pasteurized (100 g)",
    category: "dairy-bakery",
    price: 58,
    description: "Classic salted golden creamy butter for breakfast toasts and cooking.",
    image: "/easy_mart_hero.jpg"
  },
  {
    id: "em-db-5",
    name: "Fresh Farm White Eggs (Pack of 10)",
    category: "dairy-bakery",
    price: 75,
    originalPrice: 85,
    description: "Farm fresh, hygienically sorted eggs rich in protein for healthy meals.",
    image: "/easy_mart_hero.jpg"
  },

  // 3. Groceries & Daily Staples
  {
    id: "em-gs-1",
    name: "Kerala Matta / Jaya Rice (5 kg)",
    category: "groceries-staples",
    price: 265,
    originalPrice: 295,
    description: "Traditional Kerala parboiled red rice grains, nutritious and ideal for daily meals.",
    image: "/grocery_staples.jpg"
  },
  {
    id: "em-gs-2",
    name: "Royal Basmati Biriyani Rice (1 kg)",
    category: "groceries-staples",
    price: 135,
    originalPrice: 160,
    description: "Long grain aromatic Basmati rice with signature fragrance, ideal for festive rice dishes.",
    image: "/grocery_staples.jpg"
  },
  {
    id: "em-gs-3",
    name: "Aashirvaad Shudh Chakki Atta (5 kg)",
    category: "groceries-staples",
    price: 245,
    originalPrice: 270,
    description: "100% pure whole wheat flour processed in traditional chakki mills for ultra-soft rotis.",
    image: "/grocery_staples.jpg"
  },
  {
    id: "em-gs-4",
    name: "Sunrich Refined Sunflower Oil (1 L)",
    category: "groceries-staples",
    price: 145,
    originalPrice: 165,
    description: "Healthy, light cooking oil fortified with Vitamin A & D for everyday deep and shallow frying.",
    image: "/grocery_staples.jpg"
  },
  {
    id: "em-gs-5",
    name: "Eastern Malabar Spices Combo (Turmeric + Chilli + Coriander 100g each)",
    category: "groceries-staples",
    price: 95,
    originalPrice: 115,
    description: "Finely ground authentic Kerala spices ensuring authentic aroma and vibrant color.",
    image: "/grocery_staples.jpg"
  },

  // 4. Snacks & Beverages
  {
    id: "em-sb-1",
    name: "Malabar Crispy Banana Chips in Pure Coconut Oil (250 g)",
    category: "snacks-beverages",
    price: 95,
    originalPrice: 110,
    description: "Crisp, golden-fried raw banana slices made in virgin coconut oil with just a hint of salt.",
    image: "/grocery_staples.jpg"
  },
  {
    id: "em-sb-2",
    name: "Kannan Devan Classic Strong Tea (250 g)",
    category: "snacks-beverages",
    price: 115,
    description: "Finest Munnar hill tea leaves blending rich golden color with robust aroma.",
    image: "/grocery_staples.jpg"
  },
  {
    id: "em-sb-3",
    name: "Bru Instant Roasted Coffee (50 g)",
    category: "snacks-beverages",
    price: 88,
    description: "Authentic coffee-chicory blend delivering the rich taste of South Indian filter coffee.",
    image: "/grocery_staples.jpg"
  },
  {
    id: "em-sb-4",
    name: "Britannia Good Day Butter Cookies (200 g)",
    category: "snacks-beverages",
    price: 35,
    description: "Crunchy rich butter cookies loaded with cashew and butter richness for tea time.",
    image: "/grocery_staples.jpg"
  },

  // 5. Household Essentials
  {
    id: "em-he-1",
    name: "Vim Lemon Concentrated Dishwash Gel (500 ml)",
    category: "household-essentials",
    price: 115,
    originalPrice: 130,
    description: "Tough grease removal formula with power of 100 lemons. Leaves utensils sparkling clean.",
    image: "/easy_mart_hero.jpg"
  },
  {
    id: "em-he-2",
    name: "Surf Excel Easy Wash Detergent Powder (1 kg)",
    category: "household-essentials",
    price: 140,
    originalPrice: 155,
    description: "Superior stain removal power that dissolves easily in water, gentle on fabrics.",
    image: "/easy_mart_hero.jpg"
  },
  {
    id: "em-he-3",
    name: "Dettol Original Germ Protection Handwash (200 ml)",
    category: "household-essentials",
    price: 89,
    description: "Trusted antiseptic liquid handwash protecting your family against 99.9% germs.",
    image: "/easy_mart_hero.jpg"
  }
];

export const INITIAL_REVIEWS: Review[] = [
  {
    id: "rev-1",
    author: "Shanoob P.",
    rating: 5,
    comment: "The best supermarket in Pallikkuni! All vegetables and fruits are fresh every morning, and the home delivery to my door is fast and well packed.",
    date: "1 day ago"
  },
  {
    id: "rev-2",
    author: "Anitha Raj",
    rating: 5,
    comment: "Ordered daily staples and milk through WhatsApp. Arrived in Pallikkuni within 30 minutes. Very courteous staff and clean service!",
    date: "3 days ago"
  },
  {
    id: "rev-3",
    author: "Jamsheer K.",
    rating: 5,
    comment: "Great discounts on rice, sunflower oil and snacks. It saves us a trip all the way to town. Very happy with Easy Mart.",
    date: "1 week ago"
  },
  {
    id: "rev-4",
    author: "Faisal M.",
    rating: 5,
    comment: "Neat packaging and reasonable supermarket rates compared to local stores around Peringathur. Highly recommended for daily needs.",
    date: "2 weeks ago"
  }
];

export interface BusinessProfile {
  name: string;
  address: string;
  locality: string;
  postalCode?: string;
  phone?: string;
  whatsapp?: string;
  plusCode?: string;
  rating?: number;
  hours?: {
    summary: string;
    daily: { day: string; open: string; close: string }[];
  };
  photos?: string[];
  mapsEmbedUrl?: string;
  googleMapsUrl?: string;
  googleReviewUrl?: string;
}

export const BUSINESS_PROFILE: BusinessProfile = {
  name: "Easy Mart Supermarket",
  address: "Pallikkuni, Peringathur",
  locality: "Pallikkuni, Kannur / Kozhikode, Kerala, India",
  postalCode: "670675",
  phone: "+91 81130 21038",
  whatsapp: "918113021038",
  plusCode: "PH7J+MR Pallikkuni, Kerala",
  rating: 4.8,
  hours: {
    summary: "Open Daily · 8:00 AM – 10:00 PM",
    daily: [
      { day: "Mon", open: "08:00", close: "22:00" },
      { day: "Tue", open: "08:00", close: "22:00" },
      { day: "Wed", open: "08:00", close: "22:00" },
      { day: "Thu", open: "08:00", close: "22:00" },
      { day: "Fri", open: "08:00", close: "22:00" },
      { day: "Sat", open: "08:00", close: "22:00" },
      { day: "Sun", open: "08:00", close: "22:00" }
    ]
  },
  photos: [
    "/easy_mart_hero.jpg",
    "/fresh_produce.jpg",
    "/grocery_staples.jpg"
  ],
  mapsEmbedUrl:
    "https://maps.google.com/maps?q=Easy+Mart+Supermarket,+Pallikkuni,+Kerala&t=&z=16&ie=UTF8&iwloc=&output=embed",
  googleMapsUrl:
    "https://maps.google.com/maps?q=easy+mart+supermarket+pallikkuni&ftid=0x3ba683756fc33259:0x3e474ebe6eb03a59",
  googleReviewUrl:
    "https://maps.google.com/maps?q=easy+mart+supermarket+pallikkuni&ftid=0x3ba683756fc33259:0x3e474ebe6eb03a59"
};

export const DEFAULT_OFFERS: Offer[] = [
  {
    id: "off-1",
    title: "Fresh Vegetables Special",
    description: "Get 15% OFF on all fresh farm vegetables and fruits.",
    discountType: "percentage",
    discountValue: 15,
    applicableProducts: ["em-fv-1", "em-fv-2", "em-fv-4", "em-fv-5"],
    active: true,
    createdAt: new Date().toISOString()
  },
  {
    id: "off-2",
    title: "Daily Staples Bundle",
    description: "Flat ₹25 OFF on premium rice & cooking oil.",
    discountType: "flat",
    discountValue: 25,
    applicableProducts: ["em-gs-1", "em-gs-2", "em-gs-4"],
    active: true,
    createdAt: new Date().toISOString()
  }
];


// Helper: load admin-managed menu items from localStorage, fallback to defaults
export function getMenuItems(): MenuItem[] {
  if (typeof window === 'undefined') return MENU_ITEMS;
  try {
    const stored = localStorage.getItem('orderflow_menu_items');
    if (stored) {
      const parsed = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) return parsed;
    }
  } catch { }
  return MENU_ITEMS;
}

// Helper: save menu items to localStorage
export function saveMenuItems(items: MenuItem[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('orderflow_menu_items', JSON.stringify(items));
    window.dispatchEvent(new Event('orderflow_products_updated'));
  } catch { }
}

// Helper: load active offers from localStorage, fallback to default offers
export function getActiveOffers(): Offer[] {
  if (typeof window === 'undefined') return DEFAULT_OFFERS;
  try {
    const stored = localStorage.getItem('orderflow_offers');
    if (stored) {
      const parsed: Offer[] = JSON.parse(stored);
      if (Array.isArray(parsed) && parsed.length > 0) {
        return parsed.filter(o => o.active);
      }
    }
  } catch { }
  return DEFAULT_OFFERS;
}

// Helper: save offers to localStorage
export function saveOffers(offers: Offer[]): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('orderflow_offers', JSON.stringify(offers));
    window.dispatchEvent(new Event('orderflow_offers_updated'));
  } catch { }
}


// Helper: compute effective price for an item after applying best offer
export function getEffectivePrice(item: MenuItem, offers: Offer[]): { price: number; originalPrice?: number; offerTitle?: string } {
  let bestDiscount = 0;
  let bestOfferTitle = '';

  for (const offer of offers) {
    const applicable = offer.applicableProducts.length === 0 || offer.applicableProducts.includes(item.id);
    if (!applicable) continue;

    let discount = 0;
    if (offer.discountType === 'percentage') {
      discount = (item.price * offer.discountValue) / 100;
    } else {
      discount = offer.discountValue;
    }

    if (discount > bestDiscount) {
      bestDiscount = discount;
      bestOfferTitle = offer.title;
    }
  }

  if (bestDiscount > 0) {
    const discounted = Math.max(0, item.price - bestDiscount);
    return { price: parseFloat(discounted.toFixed(2)), originalPrice: item.price, offerTitle: bestOfferTitle };
  }

  return { price: item.price };
}

// Helper: load enquiries from localStorage
export function getStoredEnquiries(): Enquiry[] {
  if (typeof window === 'undefined') return [];
  try {
    const existing = localStorage.getItem('orderflow_enquiries');
    if (existing) {
      const parsed = JSON.parse(existing);
      if (Array.isArray(parsed)) return parsed;
    }
  } catch { }
  return [];
}

// Helper: save an enquiry to localStorage
export function saveEnquiry(enquiry: Enquiry): void {
  if (typeof window === 'undefined') return;
  try {
    const existing = getStoredEnquiries();
    const updated = [enquiry, ...existing.filter(e => e.id !== enquiry.id && e.orderId !== enquiry.orderId)];
    localStorage.setItem('orderflow_enquiries', JSON.stringify(updated));
    window.dispatchEvent(new CustomEvent('orderflow_new_enquiry', { detail: enquiry }));
  } catch { }
}

// Helper: update an enquiry's delivery status in localStorage
export function updateEnquiryStatus(enquiryId: string, newStatus: OrderStatus): void {
  if (typeof window === 'undefined') return;
  try {
    const enquiries = getStoredEnquiries();
    const updated = enquiries.map(e => (e.id === enquiryId || e.orderId === enquiryId) ? { ...e, status: newStatus } : e);
    localStorage.setItem('orderflow_enquiries', JSON.stringify(updated));
    window.dispatchEvent(new Event('orderflow_enquiries_updated'));
  } catch { }
}

// Helper: delete an enquiry from localStorage
export function deleteStoredEnquiry(enquiryId: string): void {
  if (typeof window === 'undefined') return;
  try {
    const enquiries = getStoredEnquiries();
    const updated = enquiries.filter(e => e.id !== enquiryId && e.orderId !== enquiryId);
    localStorage.setItem('orderflow_enquiries', JSON.stringify(updated));
    window.dispatchEvent(new Event('orderflow_enquiries_updated'));
  } catch { }
}

// Helper: clear all enquiries from localStorage
export function clearAllStoredEnquiries(): void {
  if (typeof window === 'undefined') return;
  try {
    localStorage.setItem('orderflow_enquiries', JSON.stringify([]));
    window.dispatchEvent(new Event('orderflow_enquiries_updated'));
  } catch { }
}

