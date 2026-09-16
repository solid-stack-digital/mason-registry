import { MakeInjectable, type DepsType } from "@solid-stack/di";
import { IOtpRepo } from "../domain/IOtpRepo.js";
import { IOtpEmailGateway } from "../domain/IOtpEmailGateway.js";
import { Clock } from "@/shared/time/Clock.js";

export type ResendEmailOtpInput = {
  recipientid?: string | undefined;
  recipientId?: string | undefined;
  recipientemail?: string | undefined;
  recipientEmail?: string | undefined;
  email?: string | undefined;
  purpose?: string | undefined;
};

export type ResendEmailOtpOutput = {
  otpId: string;
  ok: boolean;
};

@MakeInjectable
export class ResendEmailOtp {
  public static deps = {
    otpRepo: IOtpRepo,
    emailGateway: IOtpEmailGateway,
    clock: Clock,
  };

  constructor(public deps: DepsType<typeof ResendEmailOtp.deps>) {}

  async execute(props: ResendEmailOtpInput): Promise<ResendEmailOtpOutput> {
    const recipientId =
      props.recipientid ||
      props.recipientId ||
      props.recipientemail ||
      props.recipientEmail ||
      props.email;
    const purpose = props.purpose || "EMAIL_VERIFICATION";

    if (!recipientId) {
      throw new Error("recipientId is required");
    }

    const existing = await this.deps.otpRepo.findLatestByRecipientAndPurpose(
      recipientId,
      purpose
    );

    if (!existing) {
      throw new Error(
        `No OTP record found for recipient ${recipientId} and purpose ${purpose}`
      );
    }

    const now = this.deps.clock.now();

    if (now.isAfter(existing.expiresAt)) {
      throw new Error(
        "Cannot resend: existing OTP has expired. Please request a new OTP"
      );
    }

    // Rate limiting: prevent spamming resend within 30 seconds
    const diff = now.distanceFrom(existing.updatedAt);
    const minInterval = this.deps.clock.duration("30s");
    if (diff.millis < minInterval.millis) {
      throw new Error("Please wait 30 seconds before requesting another OTP");
    }

    await this.deps.emailGateway.sendEmail({
      to: existing.recipientEmail,
      subject: `Your verification code: ${existing.otpCode}`,
      body: `Your OTP is: ${existing.otpCode}. It will expire in 5 minutes.`,
    });

    existing.updatedAt = now;
    await this.deps.otpRepo.update(existing);

    return { otpId: existing.id, ok: true };
  }
}
