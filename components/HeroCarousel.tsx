"use client";
import Link from "next/link";
import { useEffect, useState } from "react";

const SLIDES = [
  { tag: "MEET ON CAMPUS", title: "Meet. Inspect. Then pay.", text: "Every deal happens face to face. Check the item in your hands before a single naira changes hands.", emoji: "🤝", cta: "Create free account", href: "/dashboard", bg: "#0a0a0a" },
  { tag: "BACK TO SCHOOL", title: "Up to 40% off textbooks and past questions", text: "Cheaper than the bookshop, from students who just finished the course.", emoji: "📚", cta: "Shop textbooks", href: "/browse?cat=textbooks", bg: "#1a1a1a" },
  { tag: "TECH DEALS", title: "Phones, earbuds and power banks", text: "Test every device on the spot with verified sellers before you pay.", emoji: "📱", cta: "Shop electronics", href: "/browse?cat=phones", bg: "#262626" },
  { tag: "CAMPUS SERVICES", title: "Braiding, tutoring and printing", text: "Book trusted services close to your hostel.", emoji: "💇", cta: "Browse services", href: "/browse?cat=services", bg: "#111" },
];

export default function HeroCarousel() {
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const go = (d: number) => setI((v) => (v + d + SLIDES.length) % SLIDES.length);

  useEffect(() => {
    if (paused) return;
    const t = setInterval(() => setI((v) => (v + 1) % SLIDES.length), 5000);
    return () => clearInterval(t);
  }, [paused]);

  return (
    <section
      className="dp-car"
      onMouseEnter={() => setPaused(true)}
      onMouseLeave={() => setPaused(false)}
      aria-roledescription="carousel"
    >
      <div className="dp-track" style={{ transform: `translateX(-${i * 100}%)` }}>
        {SLIDES.map((s) => (
          <div key={s.tag} className="dp-slide" style={{ background: s.bg }}>
            <div>
              <div style={{ color: "#bdbdbd", letterSpacing: 2, fontSize: 12 }}>{s.tag}</div>
              <h1>{s.title}</h1>
              <p>{s.text}</p>
              <Link href={s.href} className="dp-btn">{s.cta}</Link>
            </div>
            <div className="dp-big" aria-hidden>{s.emoji}</div>
          </div>
        ))}
      </div>
      <button className="dp-ar l" onClick={() => go(-1)} aria-label="Previous slide">‹</button>
      <button className="dp-ar r" onClick={() => go(1)} aria-label="Next slide">›</button>
      <div className="dp-dots">
        {SLIDES.map((s, n) => (
          <button key={s.tag} className={n === i ? "on" : ""} onClick={() => setI(n)} aria-label={`Slide ${n + 1}`} />
        ))}
      </div>
    </section>
  );
}
