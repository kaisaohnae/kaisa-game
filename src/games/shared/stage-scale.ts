/** 단계(score)가 오를수록 살짝 어려워지는 수치 */
export function choiceCount(stage: number, min = 3, max = 6) {
  return Math.min(max, min + Math.floor(stage / 2));
}

export function sequenceLength(stage: number, min = 3, max = 5) {
  return Math.min(max, min + Math.floor(stage / 2));
}

export function numberSpan(stage: number, baseMax = 5) {
  return Math.min(10, baseMax + Math.floor(stage / 2));
}
