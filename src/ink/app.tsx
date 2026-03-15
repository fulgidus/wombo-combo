/**
 * app.tsx — Ink app shell component for wombo-combo.
 *
 * A minimal Ink application that renders a header, status indicator,
 * and handles the mount/unmount lifecycle. This serves as the proof-of-concept
 * that Ink works in our Bun runtime.
 */

import React from "react";
import { Box, Text } from "ink";

export interface AppProps {
  /** Optional title override for the app header. */
  title?: string;
}

/**
 * Root app shell component. Renders a bordered box with a title and status.
 */
export function App({ title = "wombo-combo" }: AppProps): React.ReactElement {
  return (
    <Box flexDirection="column" padding={1}>
      <Box marginBottom={1}>
        <Text bold color="cyan">
          {title}
        </Text>
        <Text> — Ink Shell</Text>
      </Box>
      <Box>
        <Text color="green">● </Text>
        <Text>Status: </Text>
        <Text color="green">ready</Text>
      </Box>
    </Box>
  );
}
