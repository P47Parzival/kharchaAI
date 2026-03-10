"use client";

import Link from "next/link";

export default function Home() {
  return (
    <div
      style={{
        minHeight: "100vh",
        display: "flex",
        flexDirection: "column",
        background: "var(--bg-primary)",
        overflowX: "hidden",
        position: "relative",
      }}
    >
      {/* Subtle background glow */}
      <div
        style={{
          position: "absolute",
          inset: 0,
          pointerEvents: "none",
          overflow: "hidden",
        }}
      >
        <div
          style={{
            position: "absolute",
            top: "-15%",
            left: "35%",
            width: "500px",
            height: "500px",
            borderRadius: "50%",
            background: "rgba(108, 92, 231, 0.04)",
            filter: "blur(140px)",
          }}
        />
        <div
          style={{
            position: "absolute",
            bottom: "-10%",
            right: "25%",
            width: "400px",
            height: "400px",
            borderRadius: "50%",
            background: "rgba(167, 139, 250, 0.03)",
            filter: "blur(120px)",
          }}
        />
      </div>

      {/* ─── Navbar ─── */}
      <nav className="page-container" style={{ position: "relative", zIndex: 10, paddingTop: "1.25rem", paddingBottom: "1.25rem", display: "flex", alignItems: "center", justifyContent: "space-between" }}>
        <div style={{ display: "flex", alignItems: "center", gap: "0.75rem" }}>
          <div
            style={{
              width: "40px",
              height: "40px",
              borderRadius: "12px",
              background: "linear-gradient(135deg, #6c5ce7, #a78bfa)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              color: "white",
              fontWeight: 700,
              fontSize: "1.1rem",
              boxShadow: "0 4px 16px rgba(108, 92, 231, 0.3)",
            }}
          >
            K
          </div>
          <span style={{ fontSize: "1.25rem", fontWeight: 700, color: "var(--text-primary)", letterSpacing: "-0.02em" }}>
            Kharcha<span className="gradient-text">AI</span>
          </span>
        </div>
        <Link href="/chat" className="btn-nav">
          Start Chatting
        </Link>
      </nav>

      {/* ─── Hero Section — Two Columns ─── */}
      <main
        className="page-container"
        style={{
          position: "relative",
          zIndex: 10,
          flex: 1,
          display: "flex",
          alignItems: "center",
          paddingTop: "3rem",
          paddingBottom: "4rem",
        }}
      >
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr",
            gap: "3rem",
            width: "100%",
            alignItems: "center",
          }}
          className="hero-grid"
        >
          {/* Left Column */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "flex-start" }}>
            <div
              className="animate-slide-up"
              style={{ animationDelay: "0.1s", opacity: 0, marginBottom: "1.5rem" }}
            >
              <span
                style={{
                  display: "inline-block",
                  padding: "0.4rem 1rem",
                  borderRadius: "100px",
                  border: "1px solid var(--border-subtle)",
                  background: "rgba(22, 22, 31, 0.6)",
                  fontSize: "0.85rem",
                  color: "var(--text-secondary)",
                }}
              >
                ✨ Real-time pricing from DigiKey, Mouser, Amazon &amp; more
              </span>
            </div>

            <h1
              className="animate-slide-up"
              style={{
                animationDelay: "0.2s",
                opacity: 0,
                fontSize: "clamp(2rem, 4vw, 3.25rem)",
                fontWeight: 800,
                lineHeight: 1.15,
                letterSpacing: "-0.03em",
                marginBottom: "1.5rem",
                color: "var(--text-primary)",
              }}
            >
              Know the{" "}
              <span className="gradient-text">Real Cost</span>
              <br />
              Before You Build
            </h1>

            <p
              className="animate-slide-up"
              style={{
                animationDelay: "0.3s",
                opacity: 0,
                fontSize: "1.05rem",
                color: "var(--text-secondary)",
                maxWidth: "480px",
                lineHeight: 1.7,
                marginBottom: "2rem",
              }}
            >
              Stop guessing. KharchaAI uses AI to identify every component your
              hardware project needs, then scrapes live prices from real suppliers
              to give you an accurate Bill of Materials.
            </p>

            <div className="animate-slide-up" style={{ animationDelay: "0.4s", opacity: 0 }}>
              <Link href="/chat" className="btn-primary">
                Estimate My Project
                <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                  <line x1="5" y1="12" x2="19" y2="12" />
                  <polyline points="12 5 19 12 12 19" />
                </svg>
              </Link>
            </div>
          </div>

          {/* Right Column — Terminal Demo */}
          <div className="animate-slide-up" style={{ animationDelay: "0.5s", opacity: 0 }}>
            <div className="terminal-card">
              <div className="terminal-dots">
                <span style={{ background: "#ef4444" }} />
                <span style={{ background: "#f59e0b" }} />
                <span style={{ background: "#10b981" }} />
                <span style={{ marginLeft: "0.5rem", fontSize: "0.75rem", color: "var(--text-muted)", fontWeight: 500 }}>
                  KharchaAI Chat
                </span>
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.75rem", fontSize: "0.9rem" }}>
                <div style={{ color: "var(--text-secondary)" }}>
                  <span style={{ color: "var(--accent-secondary)", fontWeight: 600 }}>you: </span>
                  I want to build a 4-channel EEG device for brain-computer interface research
                </div>
                <div style={{ color: "var(--text-secondary)" }}>
                  <span style={{ color: "var(--success)", fontWeight: 600 }}>KharchaAI: </span>
                  Here&apos;s your complete BOM with live pricing...
                </div>
                <div className="terminal-code">
                  <div style={{ color: "var(--accent-secondary)" }}>┌ ADS1299 EEG AFE ────── $45.20 (DigiKey)</div>
                  <div style={{ color: "var(--text-secondary)" }}>├ Ag/AgCl Electrodes ─── $12.50 (Mouser)</div>
                  <div style={{ color: "var(--text-secondary)" }}>├ ESP32-S3 DevKit ────── $8.99 (Amazon)</div>
                  <div style={{ color: "var(--text-muted)", borderTop: "1px solid var(--border-subtle)", marginTop: "0.5rem", paddingTop: "0.5rem" }}>
                    └ Total Estimate: $89.40 – $124.80
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ─── Feature Cards ─── */}
      <section
        className="page-container"
        style={{
          position: "relative",
          zIndex: 10,
          paddingTop: "5rem",
          paddingBottom: "5rem",
        }}
      >
        <h2
          style={{
            fontSize: "clamp(1.5rem, 3vw, 2rem)",
            fontWeight: 700,
            textAlign: "center",
            marginBottom: "3.5rem",
            color: "var(--text-primary)",
          }}
        >
          Why <span className="gradient-text">KharchaAI</span>?
        </h2>

        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fit, minmax(280px, 1fr))",
            gap: "2rem",
          }}
        >
          {[
            {
              icon: "🧠",
              title: "AI-Powered BOM",
              desc: "Describe your project in plain English. KharchaAI identifies every component you need — from MCUs to resistors.",
            },
            {
              icon: "🔍",
              title: "Live Price Scraping",
              desc: "Real-time prices from DigiKey, Mouser, Amazon, and Robu.in. Not cached training data — actual current prices.",
            },
            {
              icon: "📊",
              title: "Source Citations",
              desc: "Every price comes with a link to its source. Verify it yourself. We show min/avg/max and confidence scores.",
            },
          ].map((card, i) => (
            <div key={i} className="feature-card">
              <div className="icon-box">{card.icon}</div>
              <h3 style={{ fontSize: "1.15rem", fontWeight: 700, marginBottom: "0.75rem", color: "var(--text-primary)" }}>
                {card.title}
              </h3>
              <p style={{ fontSize: "0.9rem", color: "var(--text-secondary)", lineHeight: 1.7 }}>
                {card.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer
        style={{
          position: "relative",
          zIndex: 10,
          padding: "2.5rem 2rem",
          textAlign: "center",
          fontSize: "0.875rem",
          color: "var(--text-muted)",
          borderTop: "1px solid var(--border-subtle)",
        }}
      >
        Built with ❤️ by KharchaAI · Accurate pricing for builders worldwide
      </footer>

      {/* Inline responsive styles for the hero grid */}
      <style jsx>{`
        @media (min-width: 768px) {
          .hero-grid {
            grid-template-columns: 1fr 1fr !important;
            gap: 4rem !important;
          }
        }
      `}</style>
    </div>
  );
}
