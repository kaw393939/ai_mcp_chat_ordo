import type { UseCase } from "./UseCase";

/**
 * Decorator: Logging
 * 
 * Automatically logs use-case execution, parameters, and duration.
 * Adheres to the Decorator pattern (GoF).
 */
export class LoggingDecorator<TReq, TRes> implements UseCase<TReq, TRes> {
  constructor(
    private readonly decoratee: UseCase<TReq, TRes>,
    private readonly useCaseName: string
  ) {}

  async execute(request: TReq): Promise<TRes> {
    const start = Date.now();
    console.log(`[UseCase:${this.useCaseName}] START`, request);
    
    try {
      const result = await this.decoratee.execute(request);
      const duration = Date.now() - start;
      console.log(`[UseCase:${this.useCaseName}] SUCCESS (${duration}ms)`);
      return result;
    } catch (error) {
      const duration = Date.now() - start;
      console.error(`[UseCase:${this.useCaseName}] ERROR (${duration}ms)`, error);
      throw error;
    }
  }
}
