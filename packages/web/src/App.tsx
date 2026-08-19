import { PlayerSection } from './components/PlayerSection';
import { PriceCard } from './components/PriceCard';

export function App() {
  return (
    <main>
      <PlayerSection />
      <PriceCard />
      <p className="attribution">Market data provided by Coinbase.</p>
    </main>
  );
}
