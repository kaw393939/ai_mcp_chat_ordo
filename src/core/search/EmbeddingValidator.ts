import type { Embedder } from "./ports/Embedder";
import { l2Normalize } from "./l2Normalize";
import { dotSimilarity } from "./dotSimilarity";

interface ValidationPair {
  textA: string;
  textB: string;
  expectedSimilar: boolean;
}

export interface ValidationResult {
  passed: number;
  failed: number;
  details: string[];
}

const VALIDATION_PAIRS: ValidationPair[] = [
  { textA: "WCAG accessibility guidelines for color contrast", textB: "ensuring sufficient contrast ratios for visually impaired users", expectedSimilar: true },
  { textA: "responsive mobile web design with media queries", textB: "adaptive layout using CSS breakpoints for different screen sizes", expectedSimilar: true },
  { textA: "user experience heuristic evaluation methods", textB: "UX usability principles for interface design", expectedSimilar: true },
  { textA: "agile sprint planning and backlog refinement", textB: "SQL database normalization and indexing strategies", expectedSimilar: false },
  { textA: "CSS flexbox alignment and grid layout", textB: "project management methodology and risk assessment", expectedSimilar: false },
];

const SIMILAR_THRESHOLD = 0.35;
const DISSIMILAR_THRESHOLD = 0.2;

export async function validateEmbeddingQuality(
  embedder: Embedder,
): Promise<ValidationResult> {
  let passed = 0;
  let failed = 0;
  const details: string[] = [];

  for (const pair of VALIDATION_PAIRS) {
    const [vecA, vecB] = await embedder.embedBatch([pair.textA, pair.textB]);
    const normA = l2Normalize(vecA);
    const normB = l2Normalize(vecB);
    const similarity = dotSimilarity(normA, normB);

    const ok = pair.expectedSimilar
      ? similarity >= SIMILAR_THRESHOLD
      : similarity <= DISSIMILAR_THRESHOLD;

    if (ok) {
      passed++;
      details.push(
        `PASS: "${pair.textA}" ↔ "${pair.textB}" = ${similarity.toFixed(3)} (expected ${pair.expectedSimilar ? "similar" : "dissimilar"})`,
      );
    } else {
      failed++;
      details.push(
        `FAIL: "${pair.textA}" ↔ "${pair.textB}" = ${similarity.toFixed(3)} (expected ${pair.expectedSimilar ? `≥${SIMILAR_THRESHOLD}` : `≤${DISSIMILAR_THRESHOLD}`})`,
      );
    }
  }

  return { passed, failed, details };
}
