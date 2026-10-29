import { assetUrl } from "./ui";

export function BrandMark({ size = 42, className = "" }: { size?: number; className?: string }) {
  return (
    <span
      className={`brand-mark ${className}`}
      style={{ width: size, height: size }}
      aria-hidden="true"
    >
      <img src={assetUrl("logo.svg")} alt="" />
    </span>
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
