"use client";

import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-primary)] overflow-hidden relative">
      {/* Background ambient glow */}
      <div className="absolute inset-0 pointer-events-none">
        <div className="absolute top-[-20%] left-[30%] w-[600px] h-[600px] rounded-full bg-[rgba(108,92,231,0.08)] blur-[120px]" />
        <div className="absolute bottom-[-10%] right-[20%] w-[500px] h-[500px] rounded-full bg-[rgba(167,139,250,0.06)] blur-[100px]" />
      </div>

      {/* ─── Navbar ─── */}
      <nav className="relative z-10 w-full px-6 py-4 flex items-center justify-between max-w-7xl mx-auto">
        <div className="flex items-center gap-2">
          <div className="w-9 h-9 rounded-lg bg-gradient-to-br from-[#6c5ce7] to-[#a78bfa] flex items-center justify-center text-white font-bold text-lg shadow-lg">
            K
          </div>
          <span className="text-xl font-bold text-[var(--text-primary)]">
            Kharcha<span className="gradient-text">AI</span>
          </span>
        </div>
        <Link
          href="/chat"
          className="px-5 py-2.5 rounded-xl bg-gradient-to-r from-[#6c5ce7] to-[#a78bfa] text-white text-sm font-semibold transition-all hover:shadow-lg hover:shadow-[rgba(108,92,231,0.3)] hover:scale-105 active:scale-95"
        >
          Start Chatting
        </Link>
      </nav>

      {/* ─── Hero Section ─── */}
      <main className="relative z-10 flex-1 flex flex-col items-center justify-center px-6 text-center max-w-4xl mx-auto">
        <div
          className="animate-slide-up"
          style={{ animationDelay: "0.1s", opacity: 0 }}
        >
          <div className="inline-block mb-6 px-4 py-1.5 rounded-full border border-[var(--border-subtle)] bg-[var(--bg-card)] text-sm text-[var(--text-secondary)]">
            ✨ Real-time pricing from DigiKey, Mouser, Amazon & more
          </div>
        </div>

        <h1
          className="text-5xl md:text-7xl font-extrabold mb-6 leading-tight animate-slide-up"
          style={{ animationDelay: "0.2s", opacity: 0 }}
        >
          Know the{" "}
          <span className="gradient-text">Real Cost</span>
          <br />
          Before You Build
        </h1>

        <p
          className="text-lg md:text-xl text-[var(--text-secondary)] max-w-2xl mb-10 leading-relaxed animate-slide-up"
          style={{ animationDelay: "0.3s", opacity: 0 }}
        >
          Stop guessing. KharchaAI uses AI reasoning to identify every component
          your hardware project needs, then scrapes live prices from real
          suppliers to give you an accurate Bill of Materials.
        </p>

        <div
          className="flex flex-col sm:flex-row gap-4 animate-slide-up"
          style={{ animationDelay: "0.4s", opacity: 0 }}
        >
          <Link
            href="/chat"
            className="px-8 py-4 rounded-2xl bg-gradient-to-r from-[#6c5ce7] to-[#a78bfa] text-white text-lg font-semibold transition-all hover:shadow-xl hover:shadow-[rgba(108,92,231,0.3)] hover:scale-105 active:scale-95 animate-pulse-glow"
          >
            Estimate My Project →
          </Link>
        </div>

        {/* ─── Terminal-style demo preview ─── */}
        <div
          className="mt-16 w-full max-w-2xl glass-card p-6 text-left animate-slide-up"
          style={{ animationDelay: "0.6s", opacity: 0 }}
        >
          <div className="flex items-center gap-2 mb-4">
            <div className="w-3 h-3 rounded-full bg-[#ef4444]" />
            <div className="w-3 h-3 rounded-full bg-[#f59e0b]" />
            <div className="w-3 h-3 rounded-full bg-[#10b981]" />
            <span className="ml-2 text-xs text-[var(--text-muted)]">
              KharchaAI Chat
            </span>
          </div>
          <div className="space-y-3 text-sm">
            <div className="text-[var(--text-muted)]">
              <span className="text-[var(--accent-secondary)]">you:</span> I
              want to build a 4-channel EEG device for brain-computer interface
              research
            </div>
            <div className="text-[var(--text-secondary)]">
              <span className="text-[var(--success)]">KharchaAI:</span> Here's
              your complete BOM with live pricing...
            </div>
            <div className="bg-[var(--bg-input)] rounded-lg p-3 text-xs font-mono">
              <div className="text-[var(--accent-secondary)]">
                ┌ ADS1299 EEG AFE ────── $45.20 (DigiKey)
              </div>
              <div className="text-[var(--text-secondary)]">
                ├ Ag/AgCl Electrodes ─── $12.50 (Mouser)
              </div>
              <div className="text-[var(--text-secondary)]">
                ├ ESP32-S3 DevKit ────── $8.99 (Amazon)
              </div>
              <div className="text-[var(--text-muted)]">
                └ Total Estimate: $89.40 - $124.80
              </div>
            </div>
          </div>
        </div>
      </main>

      {/* ─── Feature Cards ─── */}
      <section className="relative z-10 px-6 py-20 max-w-6xl mx-auto w-full">
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {[
            {
              icon: "🧠",
              title: "AI-Powered BOM",
              desc: "Describes your project in plain English. KharchaAI identifies every component you need — from MCUs to resistors.",
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
            <div
              key={i}
              className="glass-card p-6 hover:border-[rgba(108,92,231,0.4)] transition-all duration-300 hover:translate-y-[-4px] cursor-default"
            >
              <div className="text-4xl mb-4">{card.icon}</div>
              <h3 className="text-lg font-bold mb-2 text-[var(--text-primary)]">
                {card.title}
              </h3>
              <p className="text-sm text-[var(--text-secondary)] leading-relaxed">
                {card.desc}
              </p>
            </div>
          ))}
        </div>
      </section>

      {/* ─── Footer ─── */}
      <footer className="relative z-10 py-8 text-center text-sm text-[var(--text-muted)] border-t border-[var(--border-subtle)]">
        Built with ❤️ by KharchaAI &middot; Accurate pricing for builders worldwide
      </footer>
    </div>
  );
}
