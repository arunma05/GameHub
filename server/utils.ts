export const WINNING_COMBINATIONS: number[][] = [
  // Rows
  [0, 1, 2, 3, 4],
  [5, 6, 7, 8, 9],
  [10, 11, 12, 13, 14],
  [15, 16, 17, 18, 19],
  [20, 21, 22, 23, 24],
  // Columns
  [0, 5, 10, 15, 20],
  [1, 6, 11, 16, 21],
  [2, 7, 12, 17, 22],
  [3, 8, 13, 18, 23],
  [4, 9, 14, 19, 24],
  // Diagonals
  [0, 6, 12, 18, 24],
  [4, 8, 12, 16, 20],
];

/** Generates a randomized 1–25 card (no FREE space) */
export function generateCard(): number[] {
  const numbers = Array.from({ length: 25 }, (_, i) => i + 1);
  for (let i = numbers.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [numbers[i], numbers[j]] = [numbers[j], numbers[i]];
  }
  return numbers;
}

/**
 * Returns how many complete lines (rows/cols/diagonals) a player has.
 * Each complete line earns one BINGO letter.
 * Reaching 5 means B-I-N-G-O → winner!
 */
export function countCompletedLines(card: number[], calledSet: Set<number>): number {
  return WINNING_COMBINATIONS.filter(combo =>
    combo.every(index => calledSet.has(card[index]))
  ).length;
}
