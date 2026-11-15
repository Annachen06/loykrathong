import { useEffect, useRef } from "react";
import type { FestivalConfig } from "../festivals/types";

type Story = NonNullable<FestivalConfig["story"]>;

/** The maker's story: a quiet sheet over the world, opened from a small button and closed the same way. */
export function StorySheet({ story, open, onClose }: { story: Story; open: boolean; onClose: () => void }) {
  const close = useRef<HTMLButtonElement>(null);
  useEffect(() => {
    if (!open) return;
    close.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);
  if (!open) return null;

  return (
    <div className="story-backdrop" onPointerDown={(e) => e.target === e.currentTarget && onClose()}>
      <article className="story" role="dialog" aria-modal="true" aria-labelledby="story-title">
        <button ref={close} type="button" className="story-close" aria-label="ปิด" onClick={onClose}>✕</button>
        <svg className="story-art" viewBox="0 0 320 120" role="img" aria-label="ทะเลยามค่ำคืน ดวงจันทร์ และกระทงที่มีแสงเทียน">
          <defs>
            <linearGradient id="story-sky" x1="0" y1="0" x2="0" y2="1">
              <stop offset="0" stopColor="#1a2160" />
              <stop offset="1" stopColor="#5b4a96" />
            </linearGradient>
            <radialGradient id="story-glow" cx="0.5" cy="0.5" r="0.5">
              <stop offset="0" stopColor="#fff3d6" stopOpacity="0.55" />
              <stop offset="1" stopColor="#fff3d6" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="320" height="120" fill="url(#story-sky)" />
          <circle cx="236" cy="38" r="46" fill="url(#story-glow)" />
          <circle cx="236" cy="38" r="22" fill="#fff4d6" />
          <g fill="#fff7e6">
            <circle cx="30" cy="20" r="1.4" /><circle cx="78" cy="42" r="1" /><circle cx="120" cy="14" r="1.6" />
            <circle cx="162" cy="34" r="1" /><circle cx="292" cy="18" r="1.2" /><circle cx="56" cy="64" r="1" />
          </g>
          <rect y="66" width="320" height="54" fill="#27327e" />
          <g stroke="#9aa5e8" strokeOpacity="0.45" strokeWidth="1.4" strokeLinecap="round">
            <path d="M24 78h46M110 86h58M214 76h60M60 100h70M190 104h72" />
          </g>
          <path d="M214 66h44" stroke="#ffe3a8" strokeOpacity="0.5" strokeWidth="2" strokeLinecap="round" />
          <g transform="translate(112 84)">
            <ellipse cx="0" cy="9" rx="26" ry="5" fill="#ffd98a" fillOpacity="0.25" />
            <path d="M-17 6q17 8 34 0l-4-8h-26z" fill="#e8b46a" stroke="#2a1d4a" strokeWidth="1.6" strokeLinejoin="round" />
            <path d="M0 -2v-9" stroke="#2a1d4a" strokeWidth="1.6" strokeLinecap="round" />
            <ellipse cx="0" cy="-17" rx="3" ry="5" fill="#ffd98a" />
            <ellipse cx="0" cy="-17" rx="7" ry="9" fill="#ffd98a" fillOpacity="0.25" />
          </g>
          <g transform="translate(176 96) scale(0.7)">
            <path d="M-17 6q17 8 34 0l-4-8h-26z" fill="#f2a6bf" stroke="#2a1d4a" strokeWidth="1.8" strokeLinejoin="round" />
            <path d="M0 -2v-9" stroke="#2a1d4a" strokeWidth="1.8" strokeLinecap="round" />
            <ellipse cx="0" cy="-17" rx="3" ry="5" fill="#ffd98a" />
            <ellipse cx="0" cy="-17" rx="7" ry="9" fill="#ffd98a" fillOpacity="0.25" />
          </g>
        </svg>
        <div className="story-body">
          <h2 id="story-title">{story.title}</h2>
          <p className="story-sub">{story.subtitle}</p>
          {story.paragraphs.map((para, i) => <p key={i}>{para}</p>)}
        </div>
      </article>
    </div>
  );
}
