"use client"

import React from "react";
import Image from "next/image";
import { BUSINESS_PROFILE, INITIAL_REVIEWS } from "@/lib/restaurant-data";

export default function RestaurantProfile() {
  const profile = BUSINESS_PROFILE;

  return (
    <div id="location" className="lg:col-span-5 flex flex-col text-left justify-between h-full gap-8">
      <div>
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold uppercase tracking-wider mb-3">
          🛒 Neighborhood Supermarket
        </div>
        <h2 className="text-3xl sm:text-4xl font-black text-white tracking-tight">{profile.name}</h2>
        <p className="text-sm text-slate-400 mt-2 mb-6">
          {profile.address} • {profile.locality} • {profile.postalCode}
        </p>

        <div className="glass p-5 rounded-2xl border-slate-800 space-y-4 mb-6">
          <div className="flex items-start gap-4">
            <div className="text-emerald-400 text-xl mt-1 shrink-0">📍</div>
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Store Location</h4>
              <p className="text-sm font-semibold text-white">{profile.address}, {profile.locality}</p>
              <p className="text-xs text-slate-500 mt-1">Plus Code: {profile.plusCode}</p>
            </div>
          </div>

          <div className="flex items-start gap-4 border-t border-slate-800/40 pt-4">
            <div className="text-emerald-400 text-xl mt-1 shrink-0">📞</div>
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Doorstep Delivery & Enquiries</h4>
              <div className="flex items-center gap-3">
                <a href={`tel:${profile.phone?.replace(/\s+/g, "")}`} className="text-sm font-semibold text-emerald-400 hover:underline">
                  {profile.phone}
                </a>
                <span className="text-xs bg-emerald-500/20 text-emerald-300 px-2 py-0.5 rounded font-medium">WhatsApp Active</span>
              </div>
            </div>
          </div>

          <div className="flex items-start gap-4 border-t border-slate-800/40 pt-4">
            <div className="text-emerald-400 text-xl mt-1 shrink-0">⏰</div>
            <div>
              <h4 className="text-xs font-bold text-slate-400 uppercase tracking-wider mb-1">Store Hours</h4>
              <p className="text-sm font-semibold text-white">{profile.hours?.summary}</p>
              <div className="text-[12px] text-slate-400 mt-2 grid grid-cols-3 gap-2">
                {profile.hours?.daily.map((d) => (
                  <div key={d.day} className="flex items-center gap-2">
                    <span className="w-8 text-slate-400">{d.day}</span>
                    <span className="font-medium text-white">{d.open}–{d.close}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Photos + Map */}
      <div className="space-y-4">
        <div className="grid grid-cols-3 gap-3">
          {profile.photos?.map((src, i) => (
            <div key={i} className="rounded-xl overflow-hidden bg-slate-900/40 border border-slate-800/60 relative h-28">
              <Image src={src} alt={`Easy Mart Supermarket photo ${i + 1}`} fill sizes="(max-width: 768px) 33vw, 150px" className="object-cover hover:scale-105 transition-transform duration-300" />
            </div>
          ))}
        </div>

        <div className="glass rounded-3xl overflow-hidden border-slate-800 h-64 md:h-80 w-full relative">
          <iframe
            src={profile.mapsEmbedUrl}
            width="100%"
            height="100%"
            style={{ border: 0 }}
            allowFullScreen={true}
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            className="opacity-90"
            title="Easy Mart Supermarket Pallikkuni Map"
          />
        </div>

        <div className="flex flex-wrap items-center gap-3 text-sm">
          <a href={profile.googleMapsUrl} target="_blank" rel="noreferrer" className="text-emerald-400 font-bold hover:underline">
            Open in Google Maps ↗
          </a>
          <span className="text-slate-600">•</span>
          <span className="text-slate-300 font-medium">Rating: {profile.rating} ⭐</span>
          <span className="text-slate-600">•</span>
          <span className="text-slate-400">{INITIAL_REVIEWS.length} Verified Customer Reviews</span>
        </div>
      </div>
    </div>
  );
}
