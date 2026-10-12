/**
 * modal.tsx — Reusable Modal wrapper component for Ink overlays.
 *
 * Provides a bordered box with a title label and optional footer.
 * Used as the shared container for ProgressScreen, UsageOverlay,
 * and QuestionPopup components.
 *
 * Features:
 *   - Opaque: paints blanks behind its content so whatever is rendered under
 *     it does not show through (works on any terminal background)
 *   - Bordered box with customizable border color
 *   - Title rendered as a label in the border
 *   - Optional footer area for keybind hints
 *   - Flexbox column layout for children
 */

import React, { type ReactNode, useEffect, useRef, useState } from "react";
import { Box, Text, measureElement, type DOMElement } from "ink";

export interface ModalProps {
  /** Title displayed in the modal header. */
  title: string;
  /** Optional border color. Defaults to "yellow". */
  borderColor?: string;
  /** Optional footer element (e.g. keybind hints). */
  footer?: ReactNode;
  /** Child elements rendered in the modal body. */
  children?: ReactNode;
}

/**
 * Modal — a bordered overlay container with a title and optional footer.
 *
 * Renders a flexbox column layout:
 *   ┌─ Title ──────────────┐
 *   │ children              │
 *   │                       │
 *   ├───────────────────────┤
 *   │ footer                │
 *   └───────────────────────┘
 */
export function Modal({
  title,
  borderColor = "yellow",
  footer,
  children,
}: ModalProps): React.ReactElement {
  // Ink leaves cells without content untouched, so an overlay would show the
  // screen behind it. Measure the box and paint blanks over its interior.
  const ref = useRef<DOMElement>(null);
  const [size, setSize] = useState<{ w: number; h: number } | null>(null);
  useEffect(() => {
    if (!ref.current) return;
    const { width, height } = measureElement(ref.current);
    setSize((prev) => (prev && prev.w === width && prev.h === height ? prev : { w: width, h: height }));
  });
  const fillW = size ? Math.max(0, size.w - 2) : 0;
  const fillH = size ? Math.max(0, size.h - 2) : 0;

  return (
    <Box
      ref={ref}
      flexDirection="column"
      borderStyle="round"
      borderColor={borderColor}
      paddingX={1}
    >
      {fillW > 0 && fillH > 0 && (
        <Box position="absolute">
          <Text>{Array.from({ length: fillH }, () => " ".repeat(fillW)).join("\n")}</Text>
        </Box>
      )}
      {/* Title */}
      <Box marginBottom={1}>
        <Text bold color={borderColor}>
          {title}
        </Text>
      </Box>

      {/* Body content */}
      <Box flexDirection="column" flexGrow={1}>
        {children}
      </Box>

      {/* Footer (if provided) */}
      {footer && (
        <Box marginTop={1} borderStyle="single" borderTop borderBottom={false} borderLeft={false} borderRight={false} borderColor="gray">
          {footer}
        </Box>
      )}
    </Box>
  );
}
