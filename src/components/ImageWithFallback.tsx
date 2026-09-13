import { useState, type ImgHTMLAttributes } from "react";

interface Props extends ImgHTMLAttributes<HTMLImageElement> {
  src: string;
  alt: string;
  fallbackText?: string;
}

export function ImageWithFallback({
  src,
  alt,
  fallbackText,
  className,
  ...rest
}: Props) {
  const [error, setError] = useState(false);

  if (error || !src) {
    return (
      <div
        className={`${className ?? ""} bg-paper-warm flex items-center justify-center`}
        role="img"
        aria-label={alt}
      >
        <span className="text-sm text-ink-faint px-4 text-center">
          {fallbackText ?? "Image unavailable"}
        </span>
      </div>
    );
  }

  return (
    <img
      src={src}
      alt={alt}
      className={className}
      onError={() => setError(true)}
      loading="lazy"
      {...rest}
    />
  );
}
