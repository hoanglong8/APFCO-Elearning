"use client";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div style={{ minHeight: "100vh", display: "flex", alignItems: "center", justifyContent: "center", background: "#f9fafb", padding: "1rem" }}>
          <div style={{ background: "white", borderRadius: "12px", padding: "2rem", maxWidth: "500px", width: "100%" }}>
            <h2 style={{ color: "#dc2626", fontWeight: "bold", fontSize: "1.25rem", marginBottom: "1rem" }}>Lỗi hệ thống</h2>
            <p style={{ color: "#6b7280", fontSize: "0.875rem", marginBottom: "0.5rem" }}>{error.message}</p>
            {error.digest && <p style={{ color: "#9ca3af", fontSize: "0.75rem" }}>ID: {error.digest}</p>}
            <button onClick={reset} style={{ marginTop: "1rem", background: "#2563eb", color: "white", padding: "0.5rem 1rem", borderRadius: "8px", border: "none", cursor: "pointer" }}>
              Thử lại
            </button>
          </div>
        </div>
      </body>
    </html>
  );
}
