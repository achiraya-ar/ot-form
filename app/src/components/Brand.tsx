import { assetUrl } from "./ui";

export function BrandMark({ size = 42, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      className={`brand-mark ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <img src={assetUrl("logo-ot.png")} alt="" />
    </span>
  );
}

export type MascotMouth = "smile" | "talk" | "grin";

export function Mascot({
  size = 280,
  className = "",
  blink = false,
  mouth = "smile",
  alt = "",
}: {
  size?: number;
  className?: string;
  blink?: boolean;
  mouth?: MascotMouth;
  alt?: string;
}) {
  const frame =
    mouth === "grin"
      ? blink
        ? "mascot-grin-blink.svg"
        : "mascot-grin.svg"
      : mouth === "talk"
        ? blink
          ? "mascot-talk-blink.svg"
          : "mascot-talk.svg"
        : blink
          ? "mascot-blink.svg"
          : "mascot.svg";

  return (
    <img
      className={`mascot ${className}`}
      src={assetUrl(frame)}
      alt={alt}
      style={{ width: size, height: "auto" }}
    />
  );
}

export function Garuda({
  size = 120,
  small = false,
  className = "",
}: {
  size?: number;
  small?: boolean;
  className?: string;
}) {
  return (
    <img
      className={className}
      src={assetUrl(small ? "garuda-small.png" : "garuda.png")}
      alt="ครุฑ"
      style={{ width: size, height: "auto" }}
    />
  );
}
