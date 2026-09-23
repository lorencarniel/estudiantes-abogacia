export interface QuizQuestion {
  statement: string;
  options: string[];
  correct_index: number;
  explanation: string;
  source_fragment: string;
  concept: string;
  option_analyses: string[];
}

export function validateSyntax(q: QuizQuestion): boolean {
  if (!q.statement || q.statement.trim().length < 10) return false;
  if (!Array.isArray(q.options) || q.options.length !== 4) return false;
  if (q.options.some((o) => !o || o.trim().length === 0)) return false;
  if (typeof q.correct_index !== "number" || q.correct_index < 0 || q.correct_index > 3) return false;
  if (!q.explanation || q.explanation.trim().length < 5) return false;
  if (!q.source_fragment || q.source_fragment.trim().length < 10) return false;
  if (!q.concept || q.concept.trim().length < 2) return false;
  if (!Array.isArray(q.option_analyses) || q.option_analyses.length !== 4) return false;
  const unique = new Set(q.options.map((o) => o.trim().toLowerCase()));
  if (unique.size < 4) return false;
  return true;
}

export function isCircularQuestion(q: QuizQuestion): boolean {
  const answer = q.options[q.correct_index]?.trim().toLowerCase() || "";
  const question = q.statement.trim().toLowerCase();
  if (answer.length < 5) return false;

  const qWords = new Set(question.replace(/[¿?.,;:()]/g, "").split(/\s+/).filter((w) => w.length > 3));
  const aWords = answer.replace(/[¿?.,;:()]/g, "").split(/\s+/).filter((w) => w.length > 3);
  if (aWords.length === 0) return false;
  const overlap = aWords.filter((w) => qWords.has(w)).length;
  const overlapRatio = overlap / aWords.length;
  return overlapRatio > 0.7;
}

export function checkTopicDistribution(questions: QuizQuestion[]): { valid: boolean; duplicated: string[] } {
  const conceptCounts = new Map<string, number>();
  for (const q of questions) {
    const c = q.concept.trim().toLowerCase();
    conceptCounts.set(c, (conceptCounts.get(c) || 0) + 1);
  }
  const duplicated = Array.from(conceptCounts.entries())
    .filter(([, count]) => count > 2)
    .map(([concept]) => concept);
  return { valid: duplicated.length === 0, duplicated };
}
