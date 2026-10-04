"use client";

/**
 * GenieLink.tsx
 *
 * macOS-Style Genie Motion Navigation Link Component
 * Drop-in wrapper around Next.js navigation with prefetching and origin tracking.
 */

import React, { useRef } from "react";
import { useRouter } from "next/navigation";
import { useGenieNavigate } from "./useGenieNavigate";

export interface GenieLinkProps
  extends React.AnchorHTMLAttributes<HTMLAnchorElement> {
  href: string;
  children: React.ReactNode;
  prefetch?: boolean;
}

export function GenieLink({
  href,
  children,
  onClick,
  onPointerDown,
  onMouseEnter,
  className,
  prefetch = true,
  ...rest
}: GenieLinkProps) {
  const router = useRouter();
  const { navigateGenie } = useGenieNavigate();
  const linkRef = useRef<HTMLAnchorElement>(null);

  // Parallel Data Loading: prefetch on hover or pointerdown
  const handleMouseEnter = (e: React.MouseEvent<HTMLAnchorElement>) => {
    if (prefetch && href.startsWith("/")) {
      router.prefetch(href);
    }
    onMouseEnter?.(e);
  };

  const handlePointerDown = (e: React.PointerEvent<HTMLAnchorElement>) => {
    if (prefetch && href.startsWith("/")) {
      router.prefetch(href);
    }
    onPointerDown?.(e);
  };

  const handleClick = (e: React.MouseEvent<HTMLAnchorElement>) => {
    // Let standard browser behaviors work for modified clicks (cmd+click, ctrl+click, external links)
    if (
      e.metaKey ||
      e.ctrlKey ||
      e.shiftKey ||
      e.altKey ||
      e.button !== 0 ||
      rest.target === "_blank" ||
      !href.startsWith("/")
    ) {
      onClick?.(e);
      return;
    }

    e.preventDefault();
    onClick?.(e);
    navigateGenie(href, linkRef.current);
  };

  return (
    <a
      ref={linkRef}
      href={href}
      data-genie-origin={href}
      onClick={handleClick}
      onMouseEnter={handleMouseEnter}
      onPointerDown={handlePointerDown}
      className={className}
      {...rest}
    >
      {children}
    </a>
  );
}

export default GenieLink;
