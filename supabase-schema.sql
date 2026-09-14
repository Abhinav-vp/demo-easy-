-- ==============================================================================
-- SUPABASE COMPLETE DATABASE ARCHITECTURE
-- Easy Mart Supermarket Online Ordering & Admin System
-- Project URL: https://lrfnvkhfckzlurbjmcrw.supabase.co
-- ==============================================================================
-- Run this complete script in Supabase Dashboard -> SQL Editor -> New Query -> Run
-- Safe to re-run: Uses IF NOT EXISTS, ALTER TABLE ADD COLUMN IF NOT EXISTS,
-- and ON CONFLICT DO NOTHING.
-- ==============================================================================

-- 1. BRANCHES TABLE
CREATE TABLE IF NOT EXISTS public.branches (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL UNIQUE,
    location TEXT,
    phone TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Seed Initial Supermarket Branches
INSERT INTO public.branches (id, name, location, phone, is_active) VALUES
('br_kariyad', 'Kariyad', 'Kariyad, Thalassery Road, Kerala', '8113021038', true),
('br_pallikkuni', 'Pallikkuni', 'Pallikkuni, Peringathur, Kerala', '8113021038', true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    location = EXCLUDED.location,
    phone = EXCLUDED.phone,
    is_active = EXCLUDED.is_active;


-- 2. CATEGORIES TABLE
CREATE TABLE IF NOT EXISTS public.categories (
    id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    slug TEXT NOT NULL UNIQUE,
    image_url TEXT,
    is_active BOOLEAN NOT NULL DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Seed Default Supermarket Categories
INSERT INTO public.categories (id, name, slug, image_url, is_active) VALUES
('cat_fv', 'Fresh Fruits & Vegetables', 'fruits-vegetables', '/fresh_produce.jpg', true),
('cat_db', 'Dairy & Bakery', 'dairy-bakery', '/easy_mart_hero.jpg', true),
('cat_gs', 'Groceries & Daily Staples', 'groceries-staples', '/grocery_staples.jpg', true),
('cat_sb', 'Snacks & Beverages', 'snacks-beverages', NULL, true),
('cat_he', 'Household Essentials', 'household-essentials', NULL, true)
ON CONFLICT (id) DO UPDATE SET
    name = EXCLUDED.name,
    slug = EXCLUDED.slug,
    image_url = EXCLUDED.image_url;


-- 3. PRODUCTS / MENU_ITEMS TABLE
-- Supports 1,000+ products with bulk import/export and duplicate prevention
CREATE TABLE IF NOT EXISTS public.menu_items (
    id TEXT PRIMARY KEY,
    product_code TEXT,
    name TEXT NOT NULL,
    slug TEXT,
    category TEXT NOT NULL,
    category_id TEXT REFERENCES public.categories(id) ON DELETE SET NULL,
    subcategory TEXT,
    brand TEXT,
    description TEXT DEFAULT '',
    price NUMERIC(10, 2) NOT NULL,
    original_price NUMERIC(10, 2),
    offer_price NUMERIC(10, 2),
    offer_percentage NUMERIC(5, 2),
    unit TEXT,
    stock INTEGER DEFAULT 0,
    image TEXT,
    image_url TEXT,
    is_available BOOLEAN DEFAULT true,
    is_offer BOOLEAN DEFAULT false,
    branch TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Safe migrations for existing installations:
ALTER TABLE public.menu_items DROP CONSTRAINT IF EXISTS menu_items_category_check;
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS product_code TEXT;
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS slug TEXT;
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS category_id TEXT REFERENCES public.categories(id) ON DELETE SET NULL;
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS subcategory TEXT;
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS brand TEXT;
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS offer_price NUMERIC(10, 2);
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS offer_percentage NUMERIC(5, 2);
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS unit TEXT;
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS stock INTEGER DEFAULT 0;
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS image_url TEXT;
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS is_available BOOLEAN DEFAULT true;
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS is_offer BOOLEAN DEFAULT false;
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS branch TEXT;
ALTER TABLE public.menu_items ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW());

-- Compatibility View: allows querying `products` or `menu_items` interchangeably
CREATE OR REPLACE VIEW public.products AS
SELECT
    id,
    product_code,
    name,
    slug,
    category,
    category_id,
    subcategory,
    brand,
    description,
    price,
    original_price,
    offer_price,
    offer_percentage,
    unit,
    stock,
    COALESCE(image, image_url) AS image,
    COALESCE(image_url, image) AS image_url,
    is_available,
    is_offer,
    branch,
    created_at,
    updated_at
FROM public.menu_items;


-- 4. PRODUCT_BRANCHES RELATIONSHIP TABLE
-- Supports branch-specific pricing, stock, and availability
CREATE TABLE IF NOT EXISTS public.product_branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id TEXT NOT NULL REFERENCES public.menu_items(id) ON DELETE CASCADE,
    branch_id TEXT REFERENCES public.branches(id) ON DELETE CASCADE,
    branch_name TEXT,
    price NUMERIC(10, 2),
    offer_price NUMERIC(10, 2),
    stock INTEGER DEFAULT 0,
    is_available BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    UNIQUE(product_id, branch_name)
);


-- 5. ORDERS / ENQUIRY TABLE
-- Stores every customer order with branch selection and delivery details
-- Supports both `public.enquiry` (singular) and `public.enquiries` (plural) for 100% compatibility
CREATE TABLE IF NOT EXISTS public.enquiry (
    id TEXT PRIMARY KEY,
    order_id TEXT UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled')),
    branch TEXT NOT NULL DEFAULT 'Pallikkuni',
    branch_id TEXT REFERENCES public.branches(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    customer_address TEXT,
    delivery_address TEXT,
    delivery_landmark TEXT,
    delivery_notes TEXT,
    payment_method TEXT DEFAULT 'COD',
    payment_status TEXT DEFAULT 'pending',
    items TEXT NOT NULL,
    item_details JSONB,
    subtotal_price NUMERIC(10, 2),
    total_quantity INTEGER DEFAULT 1,
    total_price NUMERIC(10, 2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

CREATE TABLE IF NOT EXISTS public.enquiries (
    id TEXT PRIMARY KEY,
    order_id TEXT UNIQUE,
    status TEXT NOT NULL DEFAULT 'pending' CHECK (status IN ('pending', 'confirmed', 'preparing', 'out_for_delivery', 'delivered', 'cancelled')),
    branch TEXT NOT NULL DEFAULT 'Pallikkuni',
    branch_id TEXT REFERENCES public.branches(id) ON DELETE SET NULL,
    customer_name TEXT NOT NULL,
    customer_phone TEXT NOT NULL,
    customer_email TEXT,
    customer_address TEXT,
    delivery_address TEXT,
    delivery_landmark TEXT,
    delivery_notes TEXT,
    payment_method TEXT DEFAULT 'COD',
    payment_status TEXT DEFAULT 'pending',
    items TEXT NOT NULL,
    item_details JSONB,
    subtotal_price NUMERIC(10, 2),
    total_quantity INTEGER DEFAULT 1,
    total_price NUMERIC(10, 2) NOT NULL,
    notes TEXT,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

-- Safe migrations for existing orders:
ALTER TABLE public.enquiry ADD COLUMN IF NOT EXISTS branch TEXT NOT NULL DEFAULT 'Pallikkuni';
ALTER TABLE public.enquiry ADD COLUMN IF NOT EXISTS branch_id TEXT REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.enquiry ADD COLUMN IF NOT EXISTS customer_email TEXT;
ALTER TABLE public.enquiry ADD COLUMN IF NOT EXISTS customer_address TEXT;
ALTER TABLE public.enquiry ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'COD';
ALTER TABLE public.enquiry ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';
ALTER TABLE public.enquiry ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.enquiry ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW());

ALTER TABLE public.enquiries ADD COLUMN IF NOT EXISTS branch TEXT NOT NULL DEFAULT 'Pallikkuni';
ALTER TABLE public.enquiries ADD COLUMN IF NOT EXISTS branch_id TEXT REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.enquiries ADD COLUMN IF NOT EXISTS customer_email TEXT;
ALTER TABLE public.enquiries ADD COLUMN IF NOT EXISTS customer_address TEXT;
ALTER TABLE public.enquiries ADD COLUMN IF NOT EXISTS payment_method TEXT DEFAULT 'COD';
ALTER TABLE public.enquiries ADD COLUMN IF NOT EXISTS payment_status TEXT DEFAULT 'pending';
ALTER TABLE public.enquiries ADD COLUMN IF NOT EXISTS notes TEXT;
ALTER TABLE public.enquiries ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW());

-- Compatibility View: allows querying `orders` interchangeably
CREATE OR REPLACE VIEW public.orders AS
SELECT
    id,
    order_id AS order_number,
    branch,
    branch_id,
    customer_name,
    customer_phone,
    customer_email,
    customer_address,
    delivery_address,
    delivery_landmark,
    delivery_notes,
    payment_method,
    payment_status,
    status AS order_status,
    items,
    item_details,
    subtotal_price,
    total_quantity,
    total_price AS total_amount,
    notes,
    created_at,
    updated_at
FROM public.enquiry;


-- 6. ORDER_ITEMS TABLE
-- Freezes historical product pricing and item details at time of ordering
CREATE TABLE IF NOT EXISTS public.order_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    order_id TEXT NOT NULL REFERENCES public.enquiries(id) ON DELETE CASCADE,
    product_id TEXT,
    product_name TEXT NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    unit_price NUMERIC(10, 2) NOT NULL,
    offer_price NUMERIC(10, 2),
    total_price NUMERIC(10, 2) NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);


-- 7. OFFERS TABLE
CREATE TABLE IF NOT EXISTS public.offers (
    id TEXT PRIMARY KEY,
    product_id TEXT REFERENCES public.menu_items(id) ON DELETE SET NULL,
    branch_id TEXT REFERENCES public.branches(id) ON DELETE SET NULL,
    title TEXT NOT NULL,
    description TEXT DEFAULT '',
    discount_type TEXT NOT NULL CHECK (discount_type IN ('percentage', 'flat')),
    discount_value NUMERIC(10, 2) NOT NULL,
    applicable_products JSONB DEFAULT '[]'::jsonb,
    active BOOLEAN DEFAULT true NOT NULL,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);

ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS product_id TEXT REFERENCES public.menu_items(id) ON DELETE SET NULL;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS branch_id TEXT REFERENCES public.branches(id) ON DELETE SET NULL;
ALTER TABLE public.offers ADD COLUMN IF NOT EXISTS updated_at TIMESTAMPTZ DEFAULT TIMEZONE('utc'::text, NOW());


-- 8. ADMIN_PROFILES TABLE (Optional Role-Based Access Linked to Supabase Auth)
CREATE TABLE IF NOT EXISTS public.admin_profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID UNIQUE,
    email TEXT,
    name TEXT,
    role TEXT NOT NULL DEFAULT 'super_admin' CHECK (role IN ('super_admin', 'branch_admin')),
    branch_id TEXT REFERENCES public.branches(id) ON DELETE SET NULL,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW()),
    updated_at TIMESTAMPTZ NOT NULL DEFAULT TIMEZONE('utc'::text, NOW())
);


-- ==============================================================================
-- 9. PERFORMANCE INDEXES (Optimized for 1,000+ Products & High-Volume Orders)
-- ==============================================================================

CREATE INDEX IF NOT EXISTS idx_menu_items_name ON public.menu_items (name);
CREATE INDEX IF NOT EXISTS idx_menu_items_category ON public.menu_items (category);
CREATE INDEX IF NOT EXISTS idx_menu_items_branch ON public.menu_items (branch);
CREATE INDEX IF NOT EXISTS idx_menu_items_product_code ON public.menu_items (product_code);
CREATE INDEX IF NOT EXISTS idx_menu_items_created_at ON public.menu_items (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_enquiries_order_id ON public.enquiries (order_id);
CREATE INDEX IF NOT EXISTS idx_enquiries_branch ON public.enquiries (branch);
CREATE INDEX IF NOT EXISTS idx_enquiries_status ON public.enquiries (status);
CREATE INDEX IF NOT EXISTS idx_enquiries_created_at ON public.enquiries (created_at DESC);

CREATE INDEX IF NOT EXISTS idx_order_items_order_id ON public.order_items (order_id);
CREATE INDEX IF NOT EXISTS idx_categories_slug ON public.categories (slug);
CREATE INDEX IF NOT EXISTS idx_branches_name ON public.branches (name);
CREATE INDEX IF NOT EXISTS idx_product_branches_product_branch ON public.product_branches (product_id, branch_name);


-- ==============================================================================
-- 10. ROW LEVEL SECURITY (RLS) POLICIES
-- ==============================================================================

ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.menu_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enquiry ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.enquiries ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.order_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.admin_profiles ENABLE ROW LEVEL SECURITY;

-- 10.1 Public Read Access
DROP POLICY IF EXISTS "Public can view branches" ON public.branches;
CREATE POLICY "Public can view branches" ON public.branches FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can view categories" ON public.categories;
CREATE POLICY "Public can view categories" ON public.categories FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can view menu items" ON public.menu_items;
CREATE POLICY "Public can view menu items" ON public.menu_items FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can view product branches" ON public.product_branches;
CREATE POLICY "Public can view product branches" ON public.product_branches FOR SELECT USING (true);

DROP POLICY IF EXISTS "Public can view offers" ON public.offers;
CREATE POLICY "Public can view offers" ON public.offers FOR SELECT USING (true);

-- 10.2 Customer Order Placement (Public Insert)
DROP POLICY IF EXISTS "Anyone can create enquiry" ON public.enquiry;
CREATE POLICY "Anyone can create enquiry" ON public.enquiry FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can create enquiries" ON public.enquiries;
CREATE POLICY "Anyone can create enquiries" ON public.enquiries FOR INSERT WITH CHECK (true);

DROP POLICY IF EXISTS "Anyone can create order items" ON public.order_items;
CREATE POLICY "Anyone can create order items" ON public.order_items FOR INSERT WITH CHECK (true);

-- 10.3 Authenticated & Service Role Management Access
-- Restricts administrative mutations exclusively to server actions and authorized roles,
-- preventing unauthenticated public API abuse.
DROP POLICY IF EXISTS "Full access for branches" ON public.branches;
CREATE POLICY "Full access for branches" ON public.branches FOR ALL TO service_role, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Full access for categories" ON public.categories;
CREATE POLICY "Full access for categories" ON public.categories FOR ALL TO service_role, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Full access for menu items" ON public.menu_items;
CREATE POLICY "Full access for menu items" ON public.menu_items FOR ALL TO service_role, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Full access for product branches" ON public.product_branches;
CREATE POLICY "Full access for product branches" ON public.product_branches FOR ALL TO service_role, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Full access for enquiry" ON public.enquiry;
CREATE POLICY "Full access for enquiry" ON public.enquiry FOR ALL TO service_role, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Full access for enquiries" ON public.enquiries;
CREATE POLICY "Full access for enquiries" ON public.enquiries FOR ALL TO service_role, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Full access for order items" ON public.order_items;
CREATE POLICY "Full access for order items" ON public.order_items FOR ALL TO service_role, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Full access for offers" ON public.offers;
CREATE POLICY "Full access for offers" ON public.offers FOR ALL TO service_role, authenticated USING (true) WITH CHECK (true);

DROP POLICY IF EXISTS "Full access for admin profiles" ON public.admin_profiles;
CREATE POLICY "Full access for admin profiles" ON public.admin_profiles FOR ALL TO service_role, authenticated USING (true) WITH CHECK (true);



-- ==============================================================================
-- 11. SUPABASE REALTIME CONFIGURATION
-- ==============================================================================
-- Enable Realtime publication for incoming orders so the admin panel receives
-- instant popups and sound chimes without page reload
DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.enquiry;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_table THEN NULL;
END $$;

DO $$
BEGIN
    ALTER PUBLICATION supabase_realtime ADD TABLE public.enquiries;
EXCEPTION
    WHEN duplicate_object THEN NULL;
    WHEN undefined_table THEN NULL;
END $$;


-- ==============================================================================
-- 12. INITIAL SEED DATA (Default Easy Mart Supermarket Products)
-- ==============================================================================

INSERT INTO public.menu_items (
    id, product_code, name, category, price, original_price, description, image, image_url, branch, is_available
) VALUES
('em-fv-1', 'FV-001', 'Farm Fresh Vine Tomatoes (1 kg)', 'fruits-vegetables', 38.00, 48.00, 'Crisp, locally sourced juicy red tomatoes, hand-picked daily for optimum freshness.', '/fresh_produce.jpg', '/fresh_produce.jpg', 'Pallikkuni', true),
('em-fv-2', 'FV-002', 'Fresh Big Onions / Savola (1 kg)', 'fruits-vegetables', 42.00, 50.00, 'Premium quality cleaned onions, essential staple for everyday Kerala home cooking.', '/fresh_produce.jpg', '/fresh_produce.jpg', 'Pallikkuni', true),
('em-fv-3', 'FV-003', 'Farm Fresh Potatoes (1 kg)', 'fruits-vegetables', 34.00, NULL, 'Firm, clean cooking potatoes perfect for curries, fries, and side dishes.', '/fresh_produce.jpg', '/fresh_produce.jpg', 'Kariyad', true),
('em-fv-4', 'FV-004', 'Kerala Robusta Bananas (1 kg)', 'fruits-vegetables', 46.00, 55.00, 'Naturally sweet and wholesome bananas direct from local Kerala fruit orchards.', '/fresh_produce.jpg', '/fresh_produce.jpg', 'Pallikkuni', true),
('em-fv-5', 'FV-005', 'Crisp Royal Gala Apples (1 kg)', 'fruits-vegetables', 165.00, 190.00, 'Sweet, crunchy imported apples packed with healthy antioxidants and vitamins.', '/fresh_produce.jpg', '/fresh_produce.jpg', 'Kariyad', true),
('em-db-1', 'DB-001', 'Milma Rich Pasteurized Milk (500 ml)', 'dairy-bakery', 28.00, NULL, 'Fresh chilled daily milk sachet rich in calcium and natural proteins.', '/easy_mart_hero.jpg', '/easy_mart_hero.jpg', 'Pallikkuni', true),
('em-db-2', 'DB-002', 'Amul Fresh Malai Paneer (200 g)', 'dairy-bakery', 95.00, 110.00, 'Soft, wholesome cottage cheese cubes perfect for delicious gravies and snacks.', '/easy_mart_hero.jpg', '/easy_mart_hero.jpg', 'Pallikkuni', true),
('em-db-3', 'DB-003', 'Modern Sliced Milk Bread (400 g)', 'dairy-bakery', 45.00, NULL, 'Freshly baked soft white sandwich bread, delivered daily to the supermarket.', '/easy_mart_hero.jpg', '/easy_mart_hero.jpg', 'Kariyad', true),
('em-db-4', 'DB-004', 'Amul Butter Pasteurized (100 g)', 'dairy-bakery', 58.00, NULL, 'Classic salted golden creamy butter for breakfast toasts and cooking.', '/easy_mart_hero.jpg', '/easy_mart_hero.jpg', 'Pallikkuni', true),
('em-db-5', 'DB-005', 'Fresh Farm White Eggs (Pack of 10)', 'dairy-bakery', 75.00, 85.00, 'Farm fresh, hygienically sorted eggs rich in protein for healthy meals.', '/easy_mart_hero.jpg', '/easy_mart_hero.jpg', 'Pallikkuni', true),
('em-gs-1', 'GS-001', 'Kerala Matta / Jaya Rice (5 kg)', 'groceries-staples', 265.00, 295.00, 'Traditional Kerala parboiled red rice grains, nutritious and ideal for daily meals.', '/grocery_staples.jpg', '/grocery_staples.jpg', 'Pallikkuni', true),
('em-gs-2', 'GS-002', 'Royal Basmati Biriyani Rice (1 kg)', 'groceries-staples', 135.00, 160.00, 'Long grain aromatic Basmati rice with signature fragrance, ideal for festive rice dishes.', '/grocery_staples.jpg', '/grocery_staples.jpg', 'Kariyad', true),
('em-gs-3', 'GS-003', 'Aashirvaad Shudh Chakki Atta (5 kg)', 'groceries-staples', 245.00, 270.00, '100% pure whole wheat flour processed in traditional chakki mills for ultra-soft rotis.', '/grocery_staples.jpg', '/grocery_staples.jpg', 'Pallikkuni', true),
('em-gs-4', 'GS-004', 'Sunrich Refined Sunflower Oil (1 L)', 'groceries-staples', 145.00, 165.00, 'Healthy, light cooking oil fortified with Vitamin A & D for everyday deep and shallow frying.', '/grocery_staples.jpg', '/grocery_staples.jpg', 'Pallikkuni', true),
('em-gs-5', 'GS-005', 'Eastern Malabar Spices Combo', 'groceries-staples', 95.00, 115.00, 'Finely ground authentic Kerala spices ensuring authentic aroma and vibrant color.', '/grocery_staples.jpg', '/grocery_staples.jpg', 'Kariyad', true)
ON CONFLICT (id) DO NOTHING;
