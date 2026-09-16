import { MakeInjectable, type DepsType } from "@solid-stack/di";
import { ICredentialRepo } from "../domain/ICredentialRepo.js";
import { IRefreshTokenRepo } from "../domain/IRefreshTokenRepo.js";
import { Hasher } from "@/shared/hasher/Hasher.js";
import { IOtpGateway } from "../domain/IOtpGateway.js";
import { Clock } from "@/shared/time/Clock.js";

export type ResetPasswordInput = {
  email: string;
  code?: string | undefined;
  newPassword?: string | undefined;
  password?: string | undefined;
};

export type ResetPasswordOutput = {
  ok: boolean;
};

@MakeInjectable
export class ResetPassword {
  public static deps = {
    credRepo: ICredentialRepo,
    refreshTokenRepo: IRefreshTokenRepo,
    hasher: Hasher,
    otpGateway: IOtpGateway,
    clock: Clock,
  };

  constructor(public deps: DepsType<typeof ResetPassword.deps>) {}

  async execute(props: ResetPasswordInput): Promise<ResetPasswordOutput> {
    const newPwd = props.newPassword || props.password;
    if (!props.email || !newPwd) {
      throw new Error("Email and newPassword are required");
    }

    if (newPwd.length < 8) {
      throw new Error("Password must be at least 8 characters");
    }

    const email = props.email.trim().toLowerCase();
    const cred = await this.deps.credRepo.findByEmail(email);
    if (!cred) {
      throw new Error(`Account with email ${email} not found`);
    }

    // Validate OTP if code was passed
    if (props.code) {
      await this.deps.otpGateway.validateOtp({
        recipientId: cred.id,
        code: props.code,
        purpose: "PASSWORD_RESET",
      });
    }

    const passwordHash = await this.deps.hasher.hash(newPwd);
    cred.passwordHash = passwordHash;
    cred.updatedAt = this.deps.clock.now();
    await this.deps.credRepo.update(cred);

    // Invalidate all active sessions upon password reset
    await this.deps.refreshTokenRepo.revokeAllByCredentialId(cred.id);

    return { ok: true };
  }
}
