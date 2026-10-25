import { supabase } from "./supabaseClient";
import { SEEDED_DEV_USERS } from "./auth/constants";

export interface DBBooking {
  id: string;
  customer_id: string;
  station_id: string;
  washer_id: string | null;
  parking_spot_id: string;
  package_id: string;
  scheduled_date: string;
  slot_start: string;
  status: "pending" | "assigned" | "washing" | "awaiting_payment" | "paid" | "cancelled";
  total_inr: number;
  created_at: string;
  cancelled_at: string | null;
  cars?: { id: string; name: string; type: string; plate: string }[];
  address?: string;
  spot_label?: string;
  photos?: { kind: string; position: string; storage_path: string }[];
  payment_method?: "cash" | "upi" | null;
}

export async function fetchUserBookings(userId: string, role: string, stationId?: string | null): Promise<DBBooking[]> {
  try {
    let query = supabase.from("bookings").select(`
      id,
      customer_id,
      station_id,
      washer_id,
      parking_spot_id,
      package_id,
      scheduled_date,
      slot_start,
      status,
      total_inr,
      created_at,
      cancelled_at,
      parking_spots (address, spot_label),
      booking_cars (
        car_id,
        car_type_snapshot,
        price_inr_snapshot,
        cars (name, plate)
      ),
      photos (kind, position, storage_path),
      payments (method, status)
    `);

    if (role === "customer") {
      query = query.eq("customer_id", userId);
    } else if (role === "washer") {
      query = query.eq("washer_id", userId);
    } else if (role === "station_head" && stationId) {
      query = query.eq("station_id", stationId);
    }

    const { data, error } = await query.order("created_at", { ascending: false });
    if (error) {
      console.warn("fetchUserBookings error:", error);
      return [];
    }

    return (data || []).map((row: any) => ({
      id: row.id,
      customer_id: row.customer_id,
      station_id: row.station_id,
      washer_id: row.washer_id,
      parking_spot_id: row.parking_spot_id,
      package_id: row.package_id,
      scheduled_date: row.scheduled_date,
      slot_start: row.slot_start,
      status: row.status,
      total_inr: row.total_inr,
      created_at: row.created_at,
      cancelled_at: row.cancelled_at,
      address: row.parking_spots?.address || "Hinjewadi, Pune",
      spot_label: row.parking_spots?.spot_label || "Spot #1",
      cars: (row.booking_cars || []).map((bc: any) => ({
        id: bc.car_id,
        name: bc.cars?.name || "Car",
        type: bc.car_type_snapshot,
        plate: bc.cars?.plate || "MH 12 AB 1234",
      })),
      photos: row.photos || [],
      payment_method: row.payments?.find((p: any) => p.status === "confirmed")?.method || null,
    }));
  } catch (err) {
    console.warn("fetchUserBookings failed:", err);
    return [];
  }
}

export async function fetchUserCars(userId: string) {
  const { data } = await supabase.from("cars").select("id, name, car_type, plate").eq("owner_id", userId);
  return (data || []).map((c: any) => ({
    id: c.id,
    name: c.name,
    type: c.car_type.charAt(0).toUpperCase() + c.car_type.slice(1),
    plate: c.plate,
  }));
}

export async function fetchUserParkingSpot(userId: string) {
  const { data } = await supabase
    .from("parking_spots")
    .select("id, address, spot_label")
    .eq("owner_id", userId)
    .limit(1)
    .maybeSingle();
  return data;
}

export async function createBookingRpc(params: {
  carIds: string[];
  packageId: string;
  scheduledDate: string;
  slotStart: string;
  parkingSpotId: string;
  stationId?: string;
}) {
  const { data, error } = await supabase.rpc("create_booking", {
    p_car_ids: params.carIds,
    p_package_id: params.packageId,
    p_scheduled_date: params.scheduledDate,
    p_slot_start: params.slotStart,
    p_parking_spot_id: params.parkingSpotId,
    p_station_id: params.stationId || "green_valley",
  });
  if (error) throw error;
  return data;
}

export async function assignWasherRpc(bookingId: string, washerId: string) {
  const { data, error } = await supabase.rpc("assign_washer", {
    p_booking_id: bookingId,
    p_washer_id: washerId,
  });
  if (error) throw error;
  return data;
}

export async function startWashRpc(bookingId: string) {
  const { data, error } = await supabase.rpc("start_wash", {
    p_booking_id: bookingId,
  });
  if (error) throw error;
  return data;
}

export async function completeJobRpc(bookingId: string) {
  const { data, error } = await supabase.rpc("complete_job", {
    p_booking_id: bookingId,
  });
  if (error) throw error;
  return data;
}

export async function recordCashPaymentRpc(bookingId: string) {
  const { data, error } = await supabase.rpc("record_cash_payment", {
    p_booking_id: bookingId,
  });
  if (error) throw error;
  return data;
}

export async function cancelBookingRpc(bookingId: string) {
  const { data, error } = await supabase.rpc("cancel_booking", {
    p_booking_id: bookingId,
  });
  if (error) throw error;
  return data;
}

export async function submitReviewRpc(bookingId: string, rating: number, tags: string[], tip: number) {
  const { data, error } = await supabase.rpc("submit_review", {
    p_booking_id: bookingId,
    p_rating: rating,
    p_tags: tags,
    p_tip_inr: tip,
  });
  if (error) throw error;
  return data;
}

export async function settlePlatformFeeRpc(stationId: string) {
  const { data, error } = await supabase.rpc("settle_platform_fee", {
    p_station_id: stationId,
  });
  if (error) throw error;
  return data;
}

export async function uploadBookingPhoto(
  bookingId: string,
  kind: "before" | "after",
  position: "front" | "rear" | "left" | "right" | "existing_damage",
  file: File,
  userId: string
) {
  const filePath = `${bookingId}/${kind}/${position}.jpg`;

  // 1. Upload to Supabase Storage
  const { error: uploadError } = await supabase.storage.from("booking-photos").upload(filePath, file, {
    upsert: true,
    contentType: "image/jpeg",
  });
  if (uploadError) {
    console.warn("Storage upload error (falling back to database record):", uploadError);
  }

  // 2. Insert or replace photo record in public.photos
  const { data, error: dbError } = await supabase
    .from("photos")
    .upsert(
      {
        booking_id: bookingId,
        kind,
        position,
        storage_path: filePath,
        uploaded_by: userId,
      },
      { onConflict: "booking_id, kind, position" }
    )
    .select()
    .single();

  if (dbError) throw dbError;
  return data;
}

export function subscribeToRealtimeBookings(onUpdate: () => void) {
  const channel = supabase
    .channel("appwasher-bookings-realtime")
    .on(
      "postgres_changes",
      {
        event: "*",
        schema: "public",
        table: "bookings",
      },
      () => {
        onUpdate();
      }
    )
    .subscribe();

  return () => {
    supabase.removeChannel(channel);
  };
}
