"use client";

// Id user yang sedang login, diset oleh useSupabaseUser saat sesi berubah.
// Dipakai store non-React (mis. historyStore) untuk menentukan limit yang
// berlaku tanpa harus menerima prop/user dari komponen.
let currentUserId: string | null = null;

export function setCurrentUserId(id: string | null) {
  currentUserId = id;
}

export function getCurrentUserId() {
  return currentUserId;
}
