export interface AccountRegisteredEventProps {
	credId: string;
	email: string;
}

export class AccountRegisteredEvent {
	public readonly credId: string;
	public readonly email: string;

	constructor(props: AccountRegisteredEventProps) {
		this.credId = props.credId;
		this.email = props.email;
	}
}
