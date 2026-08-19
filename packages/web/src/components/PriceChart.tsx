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
const CHART_LATEST_X = CHART_WIDTH * 0.75;

export function PriceChart({
  history,
  direction,
}: {
  history: PriceSample[];
  direction?: PriceDirection;
}) {
  const now = Date.now();
  const visibleHistory = getRecentPriceSamples(history, now);
  const prices = visibleHistory.map(sample => sample.price);
  const minimumPrice = prices.length > 0 ? Math.min(...prices) : undefined;
  const maximumPrice = prices.length > 0 ? Math.max(...prices) : undefined;
  const points = getChartPoints(visibleHistory, minimumPrice, maximumPrice, now);
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
          <line className="price-chart-grid" x1="0" y1="1" x2={CHART_LATEST_X} y2="1" />
          <line
            className="price-chart-grid"
            x1="0"
            y1={CHART_HEIGHT / 2}
            x2={CHART_LATEST_X}
            y2={CHART_HEIGHT / 2}
          />
          <line
            className="price-chart-grid"
            x1="0"
            y1={CHART_HEIGHT - 1}
            x2={CHART_LATEST_X}
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
  now: number,
): { x: number; y: number }[] {
  if (minimumPrice === undefined || maximumPrice === undefined) {
    return [];
  }

  const range = maximumPrice - minimumPrice;
  const verticalPricePadding = range === 0 ? Math.max(maximumPrice * 0.000_01, 0.01) : range * 0.1;
  const chartMinimum = minimumPrice - verticalPricePadding;
  const chartMaximum = maximumPrice + verticalPricePadding;
  const chartRange = chartMaximum - chartMinimum;
  const drawableHeight = CHART_HEIGHT - CHART_VERTICAL_PADDING * 2;
  const windowStart = now - PRICE_HISTORY_WINDOW_MS;

  return history.map(sample => ({
    x: ((sample.sampledAt - windowStart) / PRICE_HISTORY_WINDOW_MS) * CHART_LATEST_X,
    y: CHART_VERTICAL_PADDING + ((chartMaximum - sample.price) / chartRange) * drawableHeight,
  }));
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
