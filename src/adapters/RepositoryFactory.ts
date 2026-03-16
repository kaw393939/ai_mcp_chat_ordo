import type { BookRepository } from "../core/use-cases/BookRepository";
import { FileSystemBookRepository } from "./FileSystemBookRepository";
import { CachedBookRepository } from "./CachedBookRepository";

/**
 * Repository Factory
 * 
 * Provides a central point for resolving concrete repository implementations.
 * This facilitates the Dependency Inversion Principle (DIP).
 */

let repository: BookRepository | null = null;

export function getBookRepository(): BookRepository {
  if (!repository) {
    // In a multi-environment setup, we would check ENV here 
    // to return a MockRepository or a CloudRepository.
    repository = new CachedBookRepository(new FileSystemBookRepository());
  }
  return repository;
}
