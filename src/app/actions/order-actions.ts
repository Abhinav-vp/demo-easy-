'use server';

import { revalidatePath } from 'next/cache';
import { getSupabaseServerClient, isSupabaseServerConfigured } from '@/lib/supabase/server-admin';
import { Enquiry } from '@/lib/restaurant-data';

export async function submitOrderAction(order: Enquiry): Promise<{ success: boolean; orderId?: string; error?: string }> {
  try {
    // If Supabase is not configured or user prefers local storage mode, return success immediately
    if (!isSupabaseServerConfigured()) {
      return { success: true, orderId: order.orderId };
    }

    const supabase = getSupabaseServerClient();

    // Input sanitization & bounds checking
    const customerName = String(order.customerName || '').trim().slice(0, 100);
    const customerPhone = String(order.customerPhone || '').trim().slice(0, 30);
    if (!customerName || !customerPhone) {
      return { success: false, error: 'Customer name and phone number are required' };
    }

    const safeTotalPrice = Math.max(0, parseFloat(Number(order.totalPrice || 0).toFixed(2)));
    const safeBranch = (order.branch === 'Kariyad' || order.branch === 'Pallikkuni') ? order.branch : 'Pallikkuni';

    const payload = {
      id: order.id || `enq-${Date.now()}`,
      order_id: order.orderId,
      status: 'pending' as const, // Strict enforcement: New customer orders are always pending
      branch: safeBranch,
      customer_name: customerName,
      customer_phone: customerPhone,
      delivery_address: order.deliveryAddress ? String(order.deliveryAddress).trim().slice(0, 300) : null,
      delivery_landmark: order.deliveryLandmark ? String(order.deliveryLandmark).trim().slice(0, 150) : null,
      delivery_notes: order.deliveryNotes ? String(order.deliveryNotes).trim().slice(0, 300) : null,
      items: String(order.items || '').slice(0, 2000),
      item_details: order.itemDetails || null,
      subtotal_price: order.subtotalPrice ? Math.max(0, parseFloat(Number(order.subtotalPrice).toFixed(2))) : null,
      total_quantity: Math.max(1, Math.floor(Number(order.totalQuantity) || 1)),
      total_price: safeTotalPrice,
    };

    let { error } = await supabase.from('enquiry').insert([payload]);
    if (error && (error.code === '42P01' || error.message?.includes('does not exist') || error.message?.includes('not found'))) {
      const fallbackRes = await supabase.from('enquiries').insert([payload]);
      error = fallbackRes.error;
    }

    if (error) {
      console.warn('submitOrderAction Supabase notice (saved locally):', error.message);
      return { success: true, orderId: order.orderId };
    }

    // Also insert individual line items into order_items to freeze historical pricing
    if (order.itemDetails && order.itemDetails.length > 0) {
      const itemsPayload = order.itemDetails.map((item) => ({
        order_id: payload.id,
        product_name: item.name,
        quantity: item.quantity,
        unit_price: item.unitPrice,
        total_price: item.lineTotal,
      }));
      const { error: itemsError } = await supabase.from('order_items').insert(itemsPayload);
      if (itemsError) {
        console.warn('order_items insert notice:', itemsError.message);
      }
    }

    revalidatePath('/dashboard');
    return { success: true, orderId: order.orderId };
  } catch (err: any) {
    console.warn('submitOrderAction exception (falling back to local storage):', err?.message);
    return { success: true, orderId: order.orderId };
  }
}
