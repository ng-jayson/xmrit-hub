// Legacy API client - DEPRECATED
// Use the new modular API structure from @/lib/api instead

// Re-export everything from the new API structure for backward compatibility
export {
  ApiClient,
  apiClient,
  useWorkspaces,
  useWorkspace,
  useSlide,
  type ApiError,
} from "@/lib/api";

// This file is kept for backward compatibility only
// New code should import directly from @/lib/api or its submodules
