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

    revalidatePath('/dashboard');
    return { success: true, orderId: order.orderId };
  } catch (err: any) {
    console.warn('submitOrderAction exception (falling back to local storage):', err?.message);
    return { success: true, orderId: order.orderId };
  }
}
