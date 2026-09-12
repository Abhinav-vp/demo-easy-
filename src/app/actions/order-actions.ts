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

    const payload = {
      id: order.id || `enq-${Date.now()}`,
      order_id: order.orderId,
      status: order.status || 'pending',
      branch: order.branch || null,
      customer_name: order.customerName,
      customer_phone: order.customerPhone,
      delivery_address: order.deliveryAddress || null,
      delivery_landmark: order.deliveryLandmark || null,
      delivery_notes: order.deliveryNotes || null,
      items: order.items,
      item_details: order.itemDetails || null,
      subtotal_price: order.subtotalPrice || null,
      total_quantity: order.totalQuantity || 1,
      total_price: order.totalPrice,
    };

    const { error } = await supabase.from('enquiries').insert([payload]);

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
