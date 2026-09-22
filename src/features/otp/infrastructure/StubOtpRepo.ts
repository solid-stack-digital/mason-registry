import { type DepsType, MakeInjectable, ValueToken } from "@solid-stack/di";
import { Time } from "@/shared/time/domain/Time.js";
import type { IOtpRepo } from "../domain/IOtpRepo.js";
import type { Otp } from "../domain/Otp.js";

export class InitialOtps extends ValueToken<Otp[]> {}

@MakeInjectable
export class StubOtpRepo implements IOtpRepo {
	private otps: Otp[] = [];
	private errorToThrow: Error | null = null;

	public static deps = {
		initialOtps: InitialOtps,
	};

	private cloneOtp(otp: Otp): Otp {
		return {
			...otp,
			expiresAt: new Time(otp.expiresAt.millis),
			createdAt: new Time(otp.createdAt.millis),
			updatedAt: new Time(otp.updatedAt.millis),
		};
	}

	constructor(public deps: DepsType<typeof StubOtpRepo.deps>) {
		this.otps = this.deps.initialOtps
			? this.deps.initialOtps.map((o) => this.cloneOtp(o))
			: [];
	}

	public setOtps(otps: Otp[]): void {
		this.otps = otps.map((o) => this.cloneOtp(o));
	}

	public addOtp(otp: Otp): void {
		this.otps.push(this.cloneOtp(otp));
	}

	public getOtps(): Otp[] {
		return this.otps.map((o) => this.cloneOtp(o));
	}

	public clear(): void {
		this.otps = [];
		this.errorToThrow = null;
	}

	public setError(error: Error | null): void {
		this.errorToThrow = error;
	}

	async save(otp: Otp): Promise<void> {
		if (this.errorToThrow) {
			throw this.errorToThrow;
		}
		this.otps.push(this.cloneOtp(otp));
	}

	async update(otp: Otp): Promise<void> {
		if (this.errorToThrow) {
			throw this.errorToThrow;
		}
		const index = this.otps.findIndex((o) => o.id === otp.id);
		if (index !== -1) {
			this.otps[index] = this.cloneOtp(otp);
		} else {
			this.otps.push(this.cloneOtp(otp));
		}
	}

	async findLatestByRecipientAndPurpose(
		recipientId: string,
		purpose: string,
	): Promise<Otp | null> {
		if (this.errorToThrow) {
			throw this.errorToThrow;
		}
		const matches = this.otps.filter(
			(o) => o.recipientId === recipientId && o.purpose === purpose,
		);
		if (matches.length === 0) {
			return null;
		}
		matches.sort((a, b) => b.createdAt.millis - a.createdAt.millis);
		const latest = matches[0];
		return latest ? this.cloneOtp(latest) : null;
	}
}
