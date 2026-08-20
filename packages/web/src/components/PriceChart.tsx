import type { ActiveGuess } from '@btc-predictor/common';

import {
  PRICE_HISTORY_WINDOW_MS,
  formatUsdPrice,
  getRecentPriceSamples,
  type PriceDirection,
  type PriceSample,
} from '../price';
import './PriceChart.css';

const CHART_WIDTH = 600;
const CHART_HEIGHT = 120;
const CHART_VERTICAL_PADDING = 8;

export function PriceChart({
  history,
  historyStartedAt,
  direction,
  activeGuess,
}: {
  history: PriceSample[];
  historyStartedAt?: number;
  direction: PriceDirection | null;
  activeGuess: ActiveGuess | null;
}) {
  const now = Date.now();
  const visibleHistory = getRecentPriceSamples(history, now);
  const windowStart = Math.max(historyStartedAt ?? now, now - PRICE_HISTORY_WINDOW_MS);
  const prices = visibleHistory.map(sample => sample.price);
  if (activeGuess) {
    prices.push(activeGuess.entryPrice);
  }
  const minimumPrice = prices.length > 0 ? Math.min(...prices) : undefined;
  const maximumPrice = prices.length > 0 ? Math.max(...prices) : undefined;
  const points = getChartPoints(visibleHistory, minimumPrice, maximumPrice, windowStart);
  const guessPoint = activeGuess
    ? getChartPoint(
        { price: activeGuess.entryPrice, sampledAt: Date.parse(activeGuess.placedAt) },
        minimumPrice,
        maximumPrice,
        windowStart,
        true,
      )
    : undefined;
  const latestPoint = points.at(-1);
  const chartLabel = getChartLabel(minimumPrice, maximumPrice);

  return (
    <figure className="price-chart">
      <figcaption className="price-chart-caption">Last 60 seconds</figcaption>
      <div className="price-chart-canvas">
        <svg
          className={
            direction ? `price-chart-plot price-chart-plot--${direction}` : 'price-chart-plot'
          }
          viewBox={`0 0 ${CHART_WIDTH} ${CHART_HEIGHT}`}
        >
          <title>{`BTC price chart. ${chartLabel}`}</title>
          <line className="price-chart-grid" x1="0" y1="1" x2={CHART_WIDTH} y2="1" />
          <line
            className="price-chart-grid"
            x1="0"
            y1={CHART_HEIGHT / 2}
            x2={CHART_WIDTH}
            y2={CHART_HEIGHT / 2}
          />
          <line
            className="price-chart-grid"
            x1="0"
            y1={CHART_HEIGHT - 1}
            x2={CHART_WIDTH}
            y2={CHART_HEIGHT - 1}
          />
          {points.length > 1 ? (
            <polyline
              className="price-chart-line"
              points={points.map(({ x, y }) => `${x},${y}`).join(' ')}
            />
          ) : null}
          {latestPoint ? (
            <circle className="price-chart-point" cx={latestPoint.x} cy={latestPoint.y} r="4" />
          ) : null}
          {guessPoint ? (
            <g className="price-chart-guess">
              <line x1="0" y1={guessPoint.y} x2={CHART_WIDTH} y2={guessPoint.y} />
              <line x1={guessPoint.x} y1="0" x2={guessPoint.x} y2={CHART_HEIGHT} />
              <circle cx={guessPoint.x} cy={guessPoint.y} r="4" />
              <text x={guessPoint.x + 8} y={Math.max(12, guessPoint.y - 8)}>
                Guess
              </text>
            </g>
          ) : null}
        </svg>
        {minimumPrice !== undefined && maximumPrice !== undefined ? (
          <div className="price-chart-y-axis" aria-hidden="true">
            <span>High {formatUsdPrice(maximumPrice)}</span>
            <span>Low {formatUsdPrice(minimumPrice)}</span>
          </div>
        ) : null}
      </div>
    </figure>
  );
}

function getChartPoints(
  history: PriceSample[],
  minimumPrice: number | undefined,
  maximumPrice: number | undefined,
  windowStart: number,
): { x: number; y: number }[] {
  return history.flatMap(sample => {
    const point = getChartPoint(sample, minimumPrice, maximumPrice, windowStart);
    return point ? [point] : [];
  });
}

function getChartPoint(
  sample: PriceSample,
  minimumPrice: number | undefined,
  maximumPrice: number | undefined,
  windowStart: number,
  clampToWindow = false,
): { x: number; y: number } | undefined {
  if (minimumPrice === undefined || maximumPrice === undefined) {
    return undefined;
  }

  const range = maximumPrice - minimumPrice;
  const verticalPricePadding = range === 0 ? Math.max(maximumPrice * 0.000_01, 0.01) : range * 0.1;
  const chartMinimum = minimumPrice - verticalPricePadding;
  const chartMaximum = maximumPrice + verticalPricePadding;
  const drawableHeight = CHART_HEIGHT - CHART_VERTICAL_PADDING * 2;
  const x = ((sample.sampledAt - windowStart) / PRICE_HISTORY_WINDOW_MS) * CHART_WIDTH;

  return {
    x: clampToWindow ? Math.min(CHART_WIDTH, Math.max(0, x)) : x,
    y:
      CHART_VERTICAL_PADDING +
      ((chartMaximum - sample.price) / (chartMaximum - chartMinimum)) * drawableHeight,
  };
}

function getChartLabel(minimumPrice: number | undefined, maximumPrice: number | undefined): string {
  if (minimumPrice === undefined || maximumPrice === undefined) {
    return 'Collecting live data…';
  }

  if (minimumPrice === maximumPrice) {
    return `${formatUsdPrice(minimumPrice)} flat`;
  }

  return `Low ${formatUsdPrice(minimumPrice)} · High ${formatUsdPrice(maximumPrice)}`;
}
