import { Container } from "@solid-stack/di";
import { beforeEach, describe, expect, it } from "vitest";
import { Time } from "@/shared/time/domain/Time.js";
import type { EmailAccess } from "../domain/EmailAccess.js";
import { MemoryEmailAccessRepository } from "./MemoryEmailAccessRepository.js";

describe("MemoryEmailAccessRepository", () => {
	let container: Container;
	let repo: MemoryEmailAccessRepository;

	const makeAccess = (overrides: Partial<EmailAccess> = {}): EmailAccess => ({
		id: "acc-1",
		jti: "jti-1",
		email: "test@example.com",
		purpose: "RESET_PASSWORD",
		isUsed: false,
		isInvalidated: false,
		expiresAt: new Time(200000),
		createdAt: new Time(100000),
		updatedAt: new Time(100000),
		...overrides,
	});

	beforeEach(() => {
		container = new Container();
		repo = container.resolve(MemoryEmailAccessRepository);
	});

	it("saves and finds record by JTI", async () => {
		const item = makeAccess();
		await repo.save(item);

		const found = await repo.findByJti("jti-1");
		expect(found).toEqual(item);

		const notFound = await repo.findByJti("non-existent");
		expect(notFound).toBeNull();
	});

	it("finds latest by email and purpose", async () => {
		const older = makeAccess({
			id: "acc-older",
			jti: "jti-older",
			createdAt: new Time(100),
		});
		const newer = makeAccess({
			id: "acc-newer",
			jti: "jti-newer",
			createdAt: new Time(200),
		});

		await repo.save(older);
		await repo.save(newer);

		const latest = await repo.findLatestByEmailAndPurpose(
			"test@example.com",
			"RESET_PASSWORD",
		);
		expect(latest?.jti).toBe("jti-newer");
	});

	it("finds active records and invalidates all for email and purpose", async () => {
		const active1 = makeAccess({ id: "acc-1", jti: "jti-1" });
		const active2 = makeAccess({ id: "acc-2", jti: "jti-2" });
		const alreadyUsed = makeAccess({
			id: "acc-3",
			jti: "jti-3",
			isUsed: true,
		});

		await repo.save(active1);
		await repo.save(active2);
		await repo.save(alreadyUsed);

		let activeList = await repo.findActiveByEmailAndPurpose(
			"test@example.com",
			"RESET_PASSWORD",
		);
		expect(activeList).toHaveLength(2);

		await repo.invalidateAllForEmailAndPurpose(
			"test@example.com",
			"RESET_PASSWORD",
		);

		activeList = await repo.findActiveByEmailAndPurpose(
			"test@example.com",
			"RESET_PASSWORD",
		);
		expect(activeList).toHaveLength(0);
	});

	it("updates and deletes records", async () => {
		const item = makeAccess();
		await repo.save(item);

		item.isUsed = true;
		await repo.update(item);

		const updated = await repo.findByJti("jti-1");
		expect(updated?.isUsed).toBe(true);

		await repo.delete("acc-1");
		const deleted = await repo.findByJti("jti-1");
		expect(deleted).toBeNull();
	});
});
