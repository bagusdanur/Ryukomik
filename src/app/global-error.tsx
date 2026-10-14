"use client";

/**
 * Error boundary paling luar (root). Wajib render <html>/<body> sendiri karena
 * menggantikan seluruh root layout saat crash total.
 */
export default function GlobalError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  return (
    <html lang="id">
      <body style={{ margin: 0, background: "#07090f", color: "#fff", fontFamily: "system-ui, sans-serif" }}>
        <main style={{ minHeight: "100dvh", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", padding: "0 24px", textAlign: "center" }}>
          <p style={{ fontSize: 64, fontWeight: 900, color: "rgba(248,113,113,.8)", margin: 0 }}>!</p>
          <h1 style={{ fontSize: 22, fontWeight: 900, marginTop: 16 }}>Terjadi kesalahan</h1>
          <p style={{ fontSize: 14, color: "rgba(255,255,255,.45)", marginTop: 8, maxWidth: 420, lineHeight: 1.6 }}>
            Ryukomik sedang mengalami gangguan. Coba muat ulang halaman.
          </p>
          {error.digest && <p style={{ fontSize: 10, color: "rgba(255,255,255,.25)", marginTop: 12 }}>Kode: {error.digest}</p>}
          <button
            onClick={reset}
            style={{ marginTop: 28, borderRadius: 999, border: "none", background: "#22d3ee", color: "#000", fontWeight: 900, fontSize: 14, padding: "10px 22px", cursor: "pointer" }}
          >
            Muat ulang
          </button>
        </main>
      </body>
    </html>
  );
}
