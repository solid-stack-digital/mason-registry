import { MakeInjectable, type DepsType } from "@solid-stack/di";
import { ICredentialRepo } from "../domain/ICredentialRepo.js";
import { IRefreshTokenRepo } from "../domain/IRefreshTokenRepo.js";
import { Hasher } from "@/shared/hasher/Hasher.js";
import { Jwt } from "@/shared/jwt/Jwt.js";
import { Uuid } from "@/shared/uuid/Uuid.js";
import { Clock } from "@/shared/time/Clock.js";
import { type RefreshToken } from "../domain/RefreshToken.js";

export type LoginInput = {
  email: string;
  password?: string | undefined;
  clientDeviceId?: string | undefined;
};

export type LoginOutput = {
  accessToken: string;
  refreshToken: string;
  credentialId: string;
};

@MakeInjectable
export class Login {
  public static deps = {
    credRepo: ICredentialRepo,
    refreshTokenRepo: IRefreshTokenRepo,
    hasher: Hasher,
    jwt: Jwt,
    uuid: Uuid,
    clock: Clock,
  };

  constructor(public deps: DepsType<typeof Login.deps>) {}

  async execute(props: LoginInput): Promise<LoginOutput> {
    if (!props.email || typeof props.email !== "string") {
      throw new Error("Email is required");
    }

    const email = props.email.trim().toLowerCase();
    const cred = await this.deps.credRepo.findByEmail(email);

    if (!cred) {
      throw new Error("Invalid email or password");
    }

    if (props.password) {
      const isValid = await this.deps.hasher.compare(
        cred.passwordHash,
        props.password
      );
      if (!isValid) {
        throw new Error("Invalid email or password");
      }
    }

    if (!cred.isVerified) {
      throw new Error(
        "Email has not been verified. Please verify your email before logging in"
      );
    }

    const clientDeviceId = props.clientDeviceId?.trim() || "default-device";
    const refreshTokenId = this.deps.uuid.generate();
    const familyId = this.deps.uuid.generate();

    const accessTtl = this.deps.clock.duration("15m");
    const refreshTtl = this.deps.clock.duration(7 * 24 * 60 * 60 * 1000); // 7 days

    const [accessToken, refreshToken] = await Promise.all([
      this.deps.jwt.sign(
        {
          credentialId: cred.id,
          email: cred.email,
          type: "access",
        },
        { ttl: accessTtl }
      ),
      this.deps.jwt.sign(
        {
          credentialId: cred.id,
          tokenId: refreshTokenId,
          familyId,
          type: "refresh",
        },
        { ttl: refreshTtl }
      ),
    ]);

    const now = this.deps.clock.now();
    const expiresAt = now.plus(refreshTtl);

    const refreshTokenRecord: RefreshToken = {
      id: refreshTokenId,
      credentialId: cred.id,
      familyId,
      clientDeviceId,
      token: refreshToken,
      isRevoked: false,
      expiresAt,
      createdAt: now,
      updatedAt: now,
    };

    await this.deps.refreshTokenRepo.save(refreshTokenRecord);

    return {
      accessToken,
      refreshToken,
      credentialId: cred.id,
    };
  }
}
