/** 中国气象风力等级，按 10 米风速 km/h 近似。国内钓技看几级，不看英里或节。 */

export function windScale(kmh: number): number {
  if (kmh < 1) return 0;
  if (kmh < 6) return 1;
  if (kmh < 12) return 2;
  if (kmh < 20) return 3;
  if (kmh < 29) return 4;
  if (kmh < 39) return 5;
  if (kmh < 50) return 6;
  return 7;
}

export function windScaleLabel(kmh: number): string {
  return `${windScale(kmh)}级`;
}
