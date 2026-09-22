export interface PasswordChangedEventProps {
	credid?: string | undefined;
	credId?: string | undefined;
}

export class PasswordChangedEvent {
	public readonly credId: string;
	public readonly credid: string;

	constructor(props: PasswordChangedEventProps) {
		const id = props.credId ?? props.credid ?? "";
		this.credId = id;
		this.credid = id;
	}
}
