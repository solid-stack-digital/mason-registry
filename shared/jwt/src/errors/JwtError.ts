import { AppError } from "@/errors/AppError.js";

export class JwtError extends AppError {
  constructor(message: string) {
    super(message);
    this.name = this.constructor.name;
  }
}
