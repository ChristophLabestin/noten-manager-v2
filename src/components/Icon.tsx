interface IconProps {
  src: string;
  size?: number;
  color?: string;
  className?: string;
  alt?: string;
}

export default function Icon({
  src,
  size = 22,
  color,
  className,
  alt,
}: IconProps) {
  const mergedClassName = className ? `icon ${className}` : "icon";

  return (
    <span
      className={mergedClassName}
      role={alt ? "img" : "presentation"}
      aria-label={alt}
      style={{
        width: `${size}px`,
        height: `${size}px`,
        backgroundColor: color ?? "currentColor",
        WebkitMaskImage: `url(${src})`,
        maskImage: `url(${src})`,
        WebkitMaskRepeat: "no-repeat",
        maskRepeat: "no-repeat",
        WebkitMaskPosition: "center",
        maskPosition: "center",
        WebkitMaskSize: "contain",
        maskSize: "contain",
        display: "inline-block",
      }}
    />
  );
}
