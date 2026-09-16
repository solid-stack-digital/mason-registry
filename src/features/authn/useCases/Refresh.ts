import { MakeInjectable, type DepsType } from "@solid-stack/di";
import { ICredentialRepo } from "../domain/ICredentialRepo.js";
import { IRefreshTokenRepo } from "../domain/IRefreshTokenRepo.js";
import { Jwt } from "@/shared/jwt/Jwt.js";
import { Uuid } from "@/shared/uuid/Uuid.js";
import { Clock } from "@/shared/time/Clock.js";
import { type RefreshToken } from "../domain/RefreshToken.js";

export type RefreshInput = {
  refreshToken: string;
  clientDeviceId?: string | undefined;
};

export type RefreshOutput = {
  accessToken: string;
  refreshToken: string;
};

@MakeInjectable
export class Refresh {
  public static deps = {
    credRepo: ICredentialRepo,
    refreshTokenRepo: IRefreshTokenRepo,
    jwt: Jwt,
    uuid: Uuid,
    clock: Clock,
  };

  constructor(public deps: DepsType<typeof Refresh.deps>) {}

  async execute(props: RefreshInput): Promise<RefreshOutput> {
    if (!props.refreshToken || typeof props.refreshToken !== "string") {
      throw new Error("Refresh token is required");
    }

    const storedToken = await this.deps.refreshTokenRepo.findByToken(
      props.refreshToken
    );
    if (!storedToken) {
      throw new Error("Invalid or unrecognized refresh token");
    }

    // Reuse detection: If token was already revoked, revoke family / all tokens
    if (storedToken.isRevoked) {
      if (storedToken.familyId) {
        await this.deps.refreshTokenRepo.revokeFamily(storedToken.familyId);
      }
      await this.deps.refreshTokenRepo.revokeAllByCredentialId(
        storedToken.credentialId
      );
      throw new Error(
        "Revoked refresh token presented (possible replay attack)"
      );
    }

    const now = this.deps.clock.now();
    const expTime = storedToken.expiresAt;
    if (now.isAfter(expTime) || now.isEqual(expTime)) {
      throw new Error("Refresh token has expired");
    }

    if (
      props.clientDeviceId &&
      storedToken.clientDeviceId !== props.clientDeviceId.trim()
    ) {
      throw new Error(
        "Client device ID does not match the token's bound device"
      );
    }

    const cred = await this.deps.credRepo.findById(storedToken.credentialId);
    if (!cred) {
      throw new Error("Associated credential not found");
    }

    // Invalidate current refresh token
    await this.deps.refreshTokenRepo.revokeByToken(storedToken.token);

    // Create new token pair
    const newTokenId = this.deps.uuid.generate();
    const accessTtl = this.deps.clock.duration("15m");
    const refreshTtl = this.deps.clock.duration(7 * 24 * 60 * 60 * 1000);
    const newRefreshExpiresAt = now.plus(refreshTtl);

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
          clientDeviceId: storedToken.clientDeviceId,
          tokenId: newTokenId,
          familyId: storedToken.familyId,
          type: "refresh",
        },
        { ttl: refreshTtl }
      ),
    ]);

    const newRefreshTokenRecord: RefreshToken = {
      id: newTokenId,
      credentialId: cred.id,
      familyId: storedToken.familyId,
      clientDeviceId: storedToken.clientDeviceId,
      token: refreshToken,
      isRevoked: false,
      expiresAt: newRefreshExpiresAt,
      createdAt: now,
      updatedAt: now,
    };

    await this.deps.refreshTokenRepo.save(newRefreshTokenRecord);

    return {
      accessToken,
      refreshToken,
    };
  }
}
