/**
 * Server configuration - re-exports from centralized env module.
 * Prefer importing from @/server/env directly for new code.
 */
export {
  DEFAULT_CHAT_MODEL as CHAT_MODEL,
  DEFAULT_EMBEDDING_MODEL as EMBEDDING_MODEL,
  EMBEDDING_DIM,
  getGoogleGenAiKey,
} from "./env";

// For backwards compatibility with existing code that imports GOOGLE_GENAI_API_KEY
import { getGoogleGenAiKey } from "./env";
export const GOOGLE_GENAI_API_KEY = getGoogleGenAiKey();
