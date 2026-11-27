import type { CSSProperties } from "react";
import logoFullImg from "../../assets/logo-full.png";
import logoMarkImg from "../../assets/logo-mark.png";

export function LoadSmithLogoFull({
  height = 34,
  style,
}: {
  height?: number;
  style?: CSSProperties;
}) {
  return (
    <img
      src={logoFullImg}
      alt="LoadSmith - Local Smoke & Load Forge"
      style={{
        height,
        width: "auto",
        display: "block",
        objectFit: "contain",
        flexShrink: 0,
        filter: "drop-shadow(0 0 10px rgba(14, 165, 233, 0.25))",
        ...style,
      }}
    />
  );
}

export function LoadSmithMark({ size = 28 }: { size?: number }) {
  return (
    <img
      src={logoMarkImg}
      alt="LoadSmith"
      style={{
        width: size,
        height: "auto",
        display: "block",
        objectFit: "contain",
        flexShrink: 0,
        filter: "drop-shadow(0 0 8px rgba(14, 165, 233, 0.3))",
      }}
    />
  );
}
