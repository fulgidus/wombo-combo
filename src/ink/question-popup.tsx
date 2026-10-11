/**
 * question-popup.tsx — Ink QuestionPopupView component for HITL questions.
 *
 * Declarative React component. The parent manages state (questions list, current index,
 * answer text) and passes them as props.
 *
 * Features:
 *   - Displays pending HITL questions from agents
 *   - Tab/Shift+Tab to navigate between questions
 *   - Text input area for typing answers
 *   - Ctrl+S to submit the answer
 *   - Escape to close
 *   - Shows agent ID, timestamp, question text, and context
 *
 * Usage:
 *   <QuestionPopupView
 *     questions={pendingQuestions}
 *     currentIndex={currentIdx}
 *     answerText={answerText}
 *     onClose={() => setShowPopup(false)}
 *     onAnswer={(agentId, questionId, text) => submitAnswer(agentId, questionId, text)}
 *     onNavigate={(dir) => navigate(dir)}
 *     onAnswerChange={(text) => setAnswerText(text)}
 *   />
 */

import React, { useState, useEffect, useRef } from "react";
import { Box, Text } from "ink";
import { Modal } from "./modal";
import type { HitlQuestion } from "../lib/hitl-channel";
import { useScreenInput } from "./esc-menu";
import { useI18n, t as defaultT, type TFunction } from "./i18n";

// ---------------------------------------------------------------------------
// Helpers (exported for testing)
// ---------------------------------------------------------------------------

/**
 * Format a timestamp as a human-readable "time ago" string.
 */
export function timeAgo(isoTimestamp: string, t: TFunction = defaultT): string {
  const diffMs = Date.now() - new Date(isoTimestamp).getTime();
  const secs = Math.floor(diffMs / 1000);
  if (secs < 60) return t("questionPopup.secondsAgo", { count: secs });
  const mins = Math.floor(secs / 60);
  if (mins < 60) return t("questionPopup.minutesAgo", { count: mins });
  const hours = Math.floor(mins / 60);
  return t("questionPopup.hoursAgo", { hours, minutes: mins % 60 });
}

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

export interface QuestionPopupViewProps {
  /** List of pending questions. */
  questions: HitlQuestion[];
  /** Currently displayed question index. */
  currentIndex: number;
  /** Current answer text in the input field. */
  answerText: string;
  /** Called when the popup should be closed. */
  onClose: () => void;
  /** Called when the user submits an answer. */
  onAnswer: (agentId: string, questionId: string, answerText: string) => void;
  /** Called when Tab/Shift+Tab navigates questions. */
  onNavigate: (direction: "next" | "prev") => void;
  /** Called when the answer text changes. */
  onAnswerChange: (text: string) => void;
}

// ---------------------------------------------------------------------------
// Component
// ---------------------------------------------------------------------------

/**
 * QuestionPopupView — a declarative HITL question popup.
 */
export function QuestionPopupView({
  questions,
  currentIndex,
  answerText,
  onClose,
  onAnswer,
  onNavigate,
  onAnswerChange,
}: QuestionPopupViewProps): React.ReactElement {
  const t = useI18n();
  const currentQ = questions.length > 0 ? questions[currentIndex] : null;
  const [emptyError, setEmptyError] = useState(false);
  const emptyErrorTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Clear error timer on unmount
  useEffect(() => {
    return () => {
      if (emptyErrorTimerRef.current) {
        clearTimeout(emptyErrorTimerRef.current);
      }
    };
  }, []);

  useScreenInput((input, key) => {
    // Escape — close
    if (key.escape) {
      onClose();
      return;
    }

    // Ctrl+S — submit answer
    if (key.ctrl && input === "s") {
      if (currentQ && answerText.trim()) {
        onAnswer(currentQ.agentId, currentQ.id, answerText.trim());
      } else if (currentQ) {
        // Show empty answer error briefly
        setEmptyError(true);
        if (emptyErrorTimerRef.current) {
          clearTimeout(emptyErrorTimerRef.current);
        }
        emptyErrorTimerRef.current = setTimeout(() => {
          setEmptyError(false);
        }, 2000);
      }
      return;
    }

    // Shift+Tab — previous question
    if (key.shift && key.tab) {
      if (questions.length > 1) {
        onNavigate("prev");
      }
      return;
    }

    // Tab — next question
    if (key.tab) {
      if (questions.length > 1) {
        onNavigate("next");
      }
      return;
    }

    // Character input for the answer field
    // Backspace or Delete
    if (key.backspace || key.delete) {
      if (answerText.length > 0) {
        onAnswerChange(answerText.slice(0, -1));
      }
      return;
    }

    // Return in answer field — insert newline (multiline answer)
    if (key.return) {
      onAnswerChange(answerText + "\n");
      return;
    }

    // Regular text input (filter out control chars)
    if (input && !key.ctrl && !key.meta) {
      onAnswerChange(answerText + input);
    }
  });

  const count = questions.length;
  const titleStr = t("questionPopup.title", { count });

  // Build footer
  const navHint =
    count > 1
      ? `Tab ${t("questionPopup.next")}  S-Tab ${t("questionPopup.prev")}  (${currentIndex + 1}/${count})  `
      : "";

  return (
    <Modal
      title={titleStr}
      borderColor="yellow"
      footer={
        <Box>
          {count > 1 && (
            <>
              <Text dimColor>Tab</Text>
              <Text> {t("questionPopup.next")}  </Text>
              <Text dimColor>S-Tab</Text>
              <Text> {t("questionPopup.prev")}  ({currentIndex + 1}/{count})  </Text>
            </>
          )}
          <Text dimColor>Ctrl+S</Text>
          <Text> {t("questionPopup.submit")}  </Text>
          <Text dimColor>Esc</Text>
          <Text> {t("questionPopup.close")}</Text>
        </Box>
      }
    >
      {!currentQ ? (
        <Text dimColor>{t("questionPopup.none")}</Text>
      ) : (
        <Box flexDirection="column">
          {/* Header: agent info */}
          <Box marginBottom={1}>
            <Text bold>{t("questionPopup.agent")} </Text>
            <Text color="cyan">{currentQ.agentId}</Text>
            <Text>    </Text>
            <Text bold>{t("questionPopup.asked")} </Text>
            <Text dimColor>{timeAgo(currentQ.timestamp, t)}</Text>
          </Box>

          {/* Question body */}
          <Box flexDirection="column" marginBottom={1}>
            <Text bold color="yellow">
              {t("questionPopup.question")}
            </Text>
            <Text>{currentQ.text}</Text>

            {currentQ.context && (
              <Box flexDirection="column" marginTop={1}>
                <Text bold dimColor>
                  {t("questionPopup.context")}
                </Text>
                <Text dimColor>{currentQ.context}</Text>
              </Box>
            )}
          </Box>

          {/* Answer area */}
          <Box flexDirection="column">
            <Text bold color="yellow">
              {t("questionPopup.yourAnswer")}
            </Text>
            <Box
              borderStyle="single"
              borderColor={emptyError ? "red" : "cyan"}
              paddingX={1}
              minHeight={3}
            >
              <Text>{answerText || " "}</Text>
            </Box>
            {emptyError && (
              <Text color="red">{t("questionPopup.emptyError")}</Text>
            )}
          </Box>
        </Box>
      )}
    </Modal>
  );
}
