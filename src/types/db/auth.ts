/**
 * Authentication-related database entity types
 */

export interface Session {
  sessionToken: string;
  userId: string;
  expires: Date;
}
