import { type DepsType, MakeInjectable } from "@solid-stack/di";
import type {
	ConsumeEmailAccessTokenPayload,
	IEAVGateway,
} from "../domain/IEAVGateway.js";

@MakeInjectable
export class StubEAVGateway implements IEAVGateway {
	public static deps = {};
	private shouldSucceed = true;
	private errorToThrow: Error | null = null;
	public consumedCalls: ConsumeEmailAccessTokenPayload[] = [];

	constructor(public deps: DepsType<typeof StubEAVGateway.deps>) {}

	setShouldSucceed(value: boolean): void {
		this.shouldSucceed = value;
	}

	setErrorToThrow(error: Error | null): void {
		this.errorToThrow = error;
	}

	async consumeEmailAccessToken(
		payload: ConsumeEmailAccessTokenPayload,
	): Promise<boolean> {
		this.consumedCalls.push(payload);
		if (this.errorToThrow) {
			throw this.errorToThrow;
		}
		if (!this.shouldSucceed) {
			throw new Error("Invalid or rejected email access token");
		}
		return true;
	}

	clear(): void {
		this.consumedCalls = [];
		this.errorToThrow = null;
		this.shouldSucceed = true;
	}
}
