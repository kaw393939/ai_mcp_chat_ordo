import bcrypt from "bcryptjs";
import type { PasswordHasher } from "@/core/use-cases/PasswordHasher";

const DEFAULT_ROUNDS = 12;
const TEST_ROUNDS = 4;

function resolveRounds(): number {
  const env = process.env.BCRYPT_ROUNDS;
  if (env) {
    return parseInt(env, 10);
  }

  if (process.env.VITEST || process.env.NODE_ENV === "test") {
    return TEST_ROUNDS;
  }

  return DEFAULT_ROUNDS;
}

export class BcryptHasher implements PasswordHasher {
  private rounds: number;

  constructor() {
    this.rounds = resolveRounds();
  }

  async hash(plain: string): Promise<string> {
    return bcrypt.hash(plain, this.rounds);
  }

  async verify(plain: string, hash: string): Promise<boolean> {
    return bcrypt.compare(plain, hash);
  }
}
