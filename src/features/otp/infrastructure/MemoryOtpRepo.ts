import { type DepsType, MakeInjectable } from "@solid-stack/di";
import { Time } from "@/shared/time/domain/Time.js";
import type { IOtpRepo } from "../domain/IOtpRepo.js";
import type { Otp } from "../domain/Otp.js";

@MakeInjectable
export class MemoryOtpRepo implements IOtpRepo {
	public static deps = {};
	private otps: Otp[] = [];

	constructor(public deps: DepsType<typeof MemoryOtpRepo.deps>) {}

	private cloneOtp(otp: Otp): Otp {
		return {
			...otp,
			expiresAt: new Time(otp.expiresAt.millis),
			createdAt: new Time(otp.createdAt.millis),
			updatedAt: new Time(otp.updatedAt.millis),
		};
	}

	async save(otp: Otp): Promise<void> {
		this.otps.push(this.cloneOtp(otp));
	}

	async update(otp: Otp): Promise<void> {
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
		const matches = this.otps.filter(
			(o) => o.recipientId === recipientId && o.purpose === purpose,
		);
		if (matches.length === 0) {
			return null;
		}
		matches.sort((a, b) => b.createdAt.millis - a.createdAt.millis);
		return matches[0] ? this.cloneOtp(matches[0]) : null;
	}

	clear(): void {
		this.otps = [];
	}
}
