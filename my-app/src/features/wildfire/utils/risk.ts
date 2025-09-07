export const getRiskColor = (riskPercent: number): string => {
  const clamped = Math.max(0, Math.min(100, riskPercent));
  const red = Math.round((clamped / 100) * 255);
  const green = Math.round((1 - clamped / 100) * 255);
  return `rgb(${red}, ${green}, 0)`;
};

export const getRiskDescription = (riskPercent: number): string => {
  if (riskPercent < 25) return 'Нисък риск от пожар';
  if (riskPercent < 50) return 'Умерен риск от пожар';
  if (riskPercent < 75) return 'Висок риск от пожар';
  if (riskPercent < 100) return 'Много висок риск от пожар';
  return 'Открит активен пожар';
};

