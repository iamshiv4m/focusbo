export interface ShareCardData {
  totalMinutes: number;
  totalSessions: number;
  streak: number;
  bestDayLabel: string;
  bestDayMinutes: number;
  moodGreat: number;
  moodOkay: number;
  moodRough: number;
  periodLabel: string;
  dailyData: { day: string; minutes: number }[];
}

export async function generateShareCard(data: ShareCardData): Promise<string> {
  const canvas = document.createElement('canvas');
  canvas.width = 1200;
  canvas.height = 630;
  const ctx = canvas.getContext('2d');

  if (!ctx) {
    throw new Error('Canvas context unavailable');
  }

  const W = 1200;
  const H = 630;

  const bg = ctx.createLinearGradient(0, 0, W, H);
  bg.addColorStop(0, '#0a0a0f');
  bg.addColorStop(1, '#0d0d18');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, W, H);

  ctx.strokeStyle = 'rgba(255,255,255,0.03)';
  ctx.lineWidth = 1;
  for (let x = 0; x < W; x += 60) {
    ctx.beginPath();
    ctx.moveTo(x, 0);
    ctx.lineTo(x, H);
    ctx.stroke();
  }
  for (let y = 0; y < H; y += 60) {
    ctx.beginPath();
    ctx.moveTo(0, y);
    ctx.lineTo(W, y);
    ctx.stroke();
  }

  const glow = ctx.createRadialGradient(0, 0, 0, 0, 0, 400);
  glow.addColorStop(0, 'rgba(10, 132, 255, 0.15)');
  glow.addColorStop(1, 'transparent');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, H);

  ctx.font = 'bold 22px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillStyle = 'rgba(10, 132, 255, 0.8)';
  ctx.fillText('⚡ FOCUSBO', 80, 70);

  ctx.font = '16px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.3)';
  ctx.fillText(data.periodLabel, 80, 98);

  const hours = (data.totalMinutes / 60).toFixed(1);
  ctx.font = 'bold 100px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillStyle = '#ffffff';
  ctx.fillText(hours, 80, 230);
  ctx.font = 'bold 28px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.4)';
  ctx.fillText('hours of deep work', 80, 270);

  const stats = [
    { value: String(data.totalSessions), label: 'sessions' },
    { value: `${data.streak}d`, label: 'streak' },
    {
      value: data.bestDayMinutes > 0 ? `${data.bestDayMinutes}m` : '—',
      label: `best day${data.bestDayLabel ? ` (${data.bestDayLabel})` : ''}`,
    },
  ];

  stats.forEach(({ value, label }, i) => {
    const x = 80 + i * 200;
    const y = 340;
    ctx.font = 'bold 36px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillStyle = '#ffffff';
    ctx.fillText(value, x, y);
    ctx.font = '14px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.35)';
    ctx.fillText(label, x, y + 22);
  });

  if (data.dailyData.length > 0) {
    const chartX = 780;
    const chartY = 80;
    const chartW = 340;
    const chartH = 200;
    const maxMinutes = Math.max(...data.dailyData.map((d) => d.minutes), 1);
    const barW = Math.floor(chartW / data.dailyData.length) - 6;

    ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillText('THIS WEEK', chartX, chartY - 10);

    data.dailyData.forEach((d, i) => {
      const barH = (d.minutes / maxMinutes) * chartH;
      const x = chartX + i * (barW + 6);
      const y = chartY + chartH - barH;

      ctx.fillStyle =
        d.minutes > 0 ? 'rgba(10, 132, 255, 0.6)' : 'rgba(255,255,255,0.06)';
      ctx.beginPath();
      ctx.roundRect(x, y, barW, barH, [3, 3, 0, 0]);
      ctx.fill();

      ctx.font = '11px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillStyle = 'rgba(255,255,255,0.25)';
      ctx.fillText(d.day.slice(0, 2), x + barW / 2 - 7, chartY + chartH + 18);
    });
  }

  if (data.moodGreat + data.moodOkay + data.moodRough > 0) {
    const moods = [
      { emoji: '😊', count: data.moodGreat },
      { emoji: '😐', count: data.moodOkay },
      { emoji: '😔', count: data.moodRough },
    ].filter((m) => m.count > 0);

    let mx = 80;
    const my = 430;
    ctx.font = '24px -apple-system, BlinkMacSystemFont, sans-serif';
    ctx.fillStyle = 'rgba(255,255,255,0.25)';
    ctx.fillText('Moods:', mx, my);
    mx += 90;
    moods.forEach((m) => {
      ctx.font = '22px -apple-system, BlinkMacSystemFont, sans-serif';
      ctx.fillText(`${m.emoji} ${m.count}`, mx, my);
      mx += 80;
    });
  }

  ctx.strokeStyle = 'rgba(10, 132, 255, 0.3)';
  ctx.lineWidth = 2;
  ctx.beginPath();
  ctx.moveTo(80, H - 60);
  ctx.lineTo(W - 80, H - 60);
  ctx.stroke();

  ctx.font = '14px -apple-system, BlinkMacSystemFont, sans-serif';
  ctx.fillStyle = 'rgba(255,255,255,0.2)';
  ctx.fillText('focusbo.app', 80, H - 30);
  ctx.fillStyle = 'rgba(255,255,255,0.15)';
  ctx.textAlign = 'right';
  ctx.fillText(
    new Date().toLocaleDateString('en-US', {
      month: 'long',
      day: 'numeric',
      year: 'numeric',
    }),
    W - 80,
    H - 30,
  );
  ctx.textAlign = 'left';

  return canvas.toDataURL('image/png');
}
