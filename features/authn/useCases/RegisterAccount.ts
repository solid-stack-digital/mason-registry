import { MakeInjectable, type DepsType } from "@solid-stack/di";
import { ICredentialRepo } from "../domain/ICredentialRepo.js";
import { Hasher } from "@/shared/hasher/Hasher.js";
import { Uuid } from "@/shared/uuid/Uuid.js";
import { SendEmailOtp } from "@/features/otp/useCases/SendEmailOtp.js";
import { Clock } from "@/shared/time/Clock.js";
import { type Credential } from "../domain/Credential.js";

export type RegisterAccountInput = {
  email: string;
  password?: string | undefined;
  id?: string | undefined;
};

export type RegisterAccountOutput = {
  credentialId: string;
  email: string;
  isEmailVerified: boolean;
  isVerified: boolean;
};

@MakeInjectable
export class RegisterAccount {
  public static deps = {
    credRepo: ICredentialRepo,
    hasher: Hasher,
    uuid: Uuid,
    sendEmailOtpUc: SendEmailOtp,
    clock: Clock,
  };

  constructor(public deps: DepsType<typeof RegisterAccount.deps>) {}

  async execute(props: RegisterAccountInput): Promise<RegisterAccountOutput> {
    if (
      !props.email ||
      typeof props.email !== "string" ||
      !props.email.includes("@")
    ) {
      throw new Error("A valid email is required");
    }

    const email = props.email.trim().toLowerCase();
    const existing = await this.deps.credRepo.findByEmail(email);
    if (existing) {
      throw new Error("An account with this email already exists");
    }

    let passwordHash = "";
    if (props.password !== undefined) {
      if (props.password.length < 8) {
        throw new Error("Password must be at least 8 characters");
      }
      passwordHash = await this.deps.hasher.hash(props.password);
    }

    const credId = props.id || this.deps.uuid.generate();
    const now = this.deps.clock.now();

    const cred: Credential = {
      id: credId,
      email,
      passwordHash,
      isVerified: false,
      createdAt: now,
      updatedAt: now,
    };

    await this.deps.credRepo.save(cred);

    // Dispatch verification OTP via email
    await this.deps.sendEmailOtpUc.execute({
      recipientid: cred.id,
      recipientemail: cred.email,
      purpose: "EMAIL_VERIFICATION",
    });

    return {
      credentialId: cred.id,
      email: cred.email,
      isEmailVerified: cred.isVerified,
      isVerified: cred.isVerified,
    };
  }
}
