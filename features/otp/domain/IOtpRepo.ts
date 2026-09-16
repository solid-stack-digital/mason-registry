import type { Otp } from "./Otp.js";

export abstract class IOtpRepo {
  abstract save(otp: Otp): Promise<void>;
  abstract update(otp: Otp): Promise<void>;
  abstract findLatestByRecipientAndPurpose(
    recipientId: string,
    purpose: string
  ): Promise<Otp | null>;
}
