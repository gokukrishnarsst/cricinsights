"use client";

import { memo, type CSSProperties } from "react";
import type { RatedPlayerCard, StatKey } from "@/types/cricket";
import { resolveCardArtUrl, resolveTierVisual, leagueBadgeLabel, tierDisplayLabel } from "./finishTheme";
import { CRICKET_CARD_MASK } from "./card-tiers";
import { STAT_LABELS } from "@/lib/scoring/engine";
import { avatarUrl } from "@/lib/utils";

const AVATAR_MASK =
  "radial-gradient(ellipse 66% 88% at 52% 40%, #000 56%, transparent 80%), linear-gradient(220deg, #000 70%, transparent 100%), linear-gradient(180deg, transparent 1%, #000 22%)";

const FONT_MEDIUM = "var(--font-saira), 'Saira Condensed', sans-serif";
const FONT_COND = "var(--font-saira), 'Saira Condensed', sans-serif";
const FONT_BOLD = "var(--font-saira), 'Saira Condensed', sans-serif";

const STAT_CELLS: {
  k: StatKey;
  l: string;
  vx: number;
  lx: number;
  vy: number;
  ly: number;
}[] = [
  { k: "bat", l: "BAT", vx: 21.3, lx: 32.41, vy: 64.63, ly: 65.24 },
  { k: "pwr", l: "PWR", vx: 56.48, lx: 67.59, vy: 64.63, ly: 65.24 },
  { k: "dth", l: "DTH", vx: 21.3, lx: 32.41, vy: 72.2, ly: 72.8 },
  { k: "eco", l: "ECO", vx: 56.48, lx: 67.59, vy: 72.2, ly: 72.8 },
  { k: "wkt", l: "WKT", vx: 21.3, lx: 32.41, vy: 79.76, ly: 80.37 },
  { k: "clt", l: "CLT", vx: 56.48, lx: 67.59, vy: 79.76, ly: 80.37 },
];

const H_LINES: [number, number, number][] = [
  [19.44, 31.1, 10.19],
  [19.44, 40.85, 10.19],
  [16.67, 64.02, 66.67],
  [44.44, 89.63, 11.11],
];

const pad2 = (n: number) => String(Math.round(n)).padStart(2, "0");

function CricketPlayerCard({ card }: { card: RatedPlayerCard }) {
  const t = resolveTierVisual(card.tier);
  const artUrl = resolveCardArtUrl(card.tier);
  const ink = t.ink;
  const displayName = card.player.fullname.toUpperCase();
  const position =
    card.player.position ??
    card.player.role.slice(0, 3).toUpperCase();
  const fallbackAvatar = avatarUrl(card.player.fullname, String(card.player.id));

  const onAvatarError: React.ReactEventHandler<HTMLImageElement> = (e) => {
    e.currentTarget.onerror = null;
    e.currentTarget.src = fallbackAvatar;
  };

  const hideOnError: React.ReactEventHandler<HTMLImageElement> = (e) => {
    e.currentTarget.style.display = "none";
  };

  const wrap: CSSProperties = {
    containerType: "inline-size",
    position: "relative",
    width: "100%",
    aspectRatio: "540 / 820",
    filter: `drop-shadow(0 7cqw 10cqw rgba(0,0,0,.5)) drop-shadow(0 0 6cqw ${t.glow})`,
    userSelect: "none",
    WebkitUserSelect: "none",
  };

  const at = (left: number, top: number): CSSProperties => ({
    position: "absolute",
    left: `${left}%`,
    top: `${top}%`,
  });

  return (
    <div className="cric-card-frame" style={wrap}>
      <img
        src={artUrl}
        alt=""
        aria-hidden
        style={{
          position: "absolute",
          inset: 0,
          width: "100%",
          height: "100%",
          objectFit: "fill",
        }}
      />

      <div
        style={{
          position: "absolute",
          inset: 0,
          WebkitMaskImage: `url("${CRICKET_CARD_MASK}")`,
          maskImage: `url("${CRICKET_CARD_MASK}")`,
          WebkitMaskSize: "100% 100%",
          maskSize: "100% 100%",
        }}
      >
        <div
          className="team-logo-3d"
          style={{
            position: "absolute",
            left: "27cqw",
            top: "13cqw",
            width: "68cqw",
            height: "70cqw",
            WebkitMaskImage: AVATAR_MASK,
            maskImage: AVATAR_MASK,
            WebkitMaskComposite: "source-in",
            maskComposite: "intersect",
            filter: `drop-shadow(0 3cqw 6cqw rgba(0,0,0,.5)) drop-shadow(0 0 5cqw ${t.avatarHalo})`,
          }}
        >
          <img
            src={card.player.avatarUrl}
            onError={onAvatarError}
            alt={card.player.fullname}
            crossOrigin="anonymous"
            style={{
              width: "100%",
              height: "100%",
              objectFit: "cover",
              objectPosition: "center 20%",
            }}
          />
          <div
            style={{ position: "absolute", inset: 0, background: t.avatarTint }}
          />
        </div>
      </div>

      {H_LINES.map(([l, top, w], i) => (
        <div
          key={i}
          style={{
            ...at(l, top),
            width: `${w}%`,
            height: "0.3cqw",
            background: ink,
            opacity: 0.5,
          }}
        />
      ))}
      <div
        style={{
          ...at(50, 66.46),
          width: "0.3cqw",
          height: "20.12%",
          background: ink,
          opacity: 0.5,
        }}
      />

      <div
        className="rating-count"
        style={{
          ...at(16.3, 9.76),
          fontFamily: FONT_MEDIUM,
          fontSize: "22.2cqw",
          fontWeight: 500,
          lineHeight: 1,
          color: ink,
        }}
      >
        {pad2(card.overall)}
      </div>

      <div
        style={{
          ...at(25, 23.78),
          transform: "translateX(-50%)",
          fontFamily: FONT_COND,
          fontSize: "9.3cqw",
          fontWeight: 500,
          letterSpacing: ".02em",
          color: ink,
        }}
      >
        {position}
      </div>

      {card.player.teamLogoUrl ? (
        <img
          src={card.player.teamLogoUrl}
          onError={hideOnError}
          alt={card.player.team ?? "Team"}
          crossOrigin="anonymous"
          className="team-logo-3d"
          style={{
            ...at(17.59, 33.17),
            width: "14.81%",
            height: "5.73%",
            objectFit: "contain",
          }}
        />
      ) : (
        (card.player.league || card.player.team) && (
          <div
            style={{
              ...at(17.59, 33.17),
              width: "14.81%",
              height: "5.73%",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              fontFamily: FONT_COND,
              fontSize: "5cqw",
              fontWeight: 700,
              color: ink,
              letterSpacing: ".05em",
            }}
          >
            {leagueBadgeLabel(card.player.league ?? card.player.team)}
          </div>
        )
      )}

      <div
        style={{
          ...at(19.06, 42.25),
          width: "11.875%",
          height: "7.5%",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          fontFamily: FONT_COND,
          fontSize: "4.5cqw",
          fontWeight: 600,
          color: ink,
          opacity: 0.85,
          textTransform: "uppercase",
        }}
      >
        {tierDisplayLabel(card.tier)}
      </div>

      <div
        style={{
          ...at(50, 53.66),
          transform: "translateX(-50%)",
          fontFamily: FONT_BOLD,
          fontSize: "13cqw",
          fontWeight: 700,
          whiteSpace: "nowrap",
          color: ink,
        }}
      >
        {displayName.length > 14
          ? displayName.split(" ").pop()
          : displayName}
      </div>

      {STAT_CELLS.map((c) => (
        <div key={c.k}>
          <span
            className="stat-value"
            data-stat={c.k}
            style={{
              ...at(c.vx, c.vy),
              fontFamily: FONT_BOLD,
              fontSize: "10.2cqw",
              fontWeight: 700,
              color: ink,
            }}
          >
            {pad2(card.stats[c.k])}
          </span>
          <span
            style={{
              ...at(c.lx, c.ly),
              fontFamily: FONT_COND,
              fontSize: "9.3cqw",
              fontWeight: 500,
              letterSpacing: ".02em",
              color: ink,
            }}
          >
            {STAT_LABELS[c.k]}
          </span>
        </div>
      ))}

      <div className="cric-signature">
        <div
          style={{
            ...at(8, 94.8),
            fontFamily: FONT_BOLD,
            fontSize: "4.1cqw",
            fontWeight: 700,
            letterSpacing: ".1em",
            lineHeight: 1,
            color: ink,
            opacity: 0.62,
          }}
        >
          CRICINSIGHTS
        </div>
        <div
          style={{
            position: "absolute",
            right: "8%",
            top: "94.8%",
            maxWidth: "40%",
            overflow: "hidden",
            textOverflow: "ellipsis",
            fontFamily: FONT_BOLD,
            fontSize: "4.1cqw",
            fontWeight: 700,
            letterSpacing: ".1em",
            lineHeight: 1,
            whiteSpace: "nowrap",
            color: ink,
            opacity: 0.62,
          }}
        >
          {card.archetype}
        </div>
      </div>
    </div>
  );
}

export default memo(CricketPlayerCard);
