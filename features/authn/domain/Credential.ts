import type { Time } from "@/shared/time/domain/Time.js";

export interface Credential {
  id: string;
  email: string;
  passwordHash: string;
  isVerified: boolean;
  createdAt: Time;
  updatedAt: Time;
}

export type SanitizedCredential = Omit<Credential, "passwordHash">;
