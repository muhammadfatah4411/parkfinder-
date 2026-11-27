export type MessageContext =
  | "save"
  | "find"
  | "end"
  | "admin"
  | "availability";

const fallbackMessages: Record<MessageContext, string> = {
  save: "We couldn't save your parking. Please check the details and try again.",
  find: "We couldn't find a parking session for that code. Check the code and try again.",
  end: "We couldn't end the parking session. Please try again.",
  admin: "We couldn't load parking records. Please try again.",
  availability:
    "We couldn't check live availability right now. You can still try saving your parking.",
};

function toText(source: unknown): string {
  if (typeof source === "string") return source.trim();
  if (source instanceof Error) return source.message.trim();
  if (source && typeof source === "object" && "message" in source) {
    const message = (source as { message?: unknown }).message;
    if (typeof message === "string") return message.trim();
  }
  return "";
}

export function isOccupiedMessage(source: unknown): boolean {
  const text = toText(source).toLowerCase();
  return (
    text.includes("occupied") ||
    text.includes("already taken") ||
    text.includes("slot taken") ||
    text.includes("in use")
  );
}

export function isNotFoundMessage(source: unknown): boolean {
  const text = toText(source).toLowerCase();
  return (
    text.includes("not found") ||
    text.includes("no session") ||
    text.includes("invalid code") ||
    text.includes("invalid token") ||
    text.includes("does not exist")
  );
}

export function friendlyMessage(
  source: unknown,
  context: MessageContext,
  fallback = fallbackMessages[context],
): string {
  const text = toText(source).toLowerCase();

  if (isOccupiedMessage(text) && context === "save") {
    return "That slot is already occupied. Choose another available slot.";
  }

  if (isNotFoundMessage(text) && context === "find") {
    return fallbackMessages.find;
  }

  const looksTechnical = [
    "fetch",
    "network",
    "timeout",
    "timed out",
    "unreachable",
    "unexpected response",
    "invalid json",
    "apps script",
    "configuration",
    "request failed",
    "server",
    "502",
    "500",
    "url",
    "undefined",
    "null",
  ].some((phrase) => text.includes(phrase));

  if (looksTechnical) {
    return "The parking service is temporarily unavailable. Please try again in a moment.";
  }

  return fallback;
}
