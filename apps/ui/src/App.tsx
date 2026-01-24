import { Routes, Route } from 'react-router-dom';
import { Layout } from './components/Layout';
import { DashboardPage } from './pages/Dashboard';
import { IpsPage } from './pages/Ips';
import { PortfoliosPage } from './pages/Portfolios';
import { PortfolioDetailPage } from './pages/PortfolioDetail';
import { TransactionsPage } from './pages/Transactions';
import { AlertsPage } from './pages/Alerts';
import { InstrumentsPage } from './pages/Instruments';
import { InstrumentDetailPage } from './pages/InstrumentDetail';
import { EnginePage } from './pages/Engine';
import { PricesPage } from './pages/Prices';

function App() {
  return (
    <Layout>
      <Routes>
        <Route path="/" element={<DashboardPage />} />
        <Route path="/ips" element={<IpsPage />} />
        <Route path="/portfolios" element={<PortfoliosPage />} />
        <Route path="/portfolios/:id" element={<PortfolioDetailPage />} />
        <Route path="/transactions" element={<TransactionsPage />} />
        <Route path="/alerts" element={<AlertsPage />} />
        <Route path="/instruments" element={<InstrumentsPage />} />
        <Route path="/instruments/:id" element={<InstrumentDetailPage />} />
        <Route path="/engine" element={<EnginePage />} />
        <Route path="/prices" element={<PricesPage />} />
      </Routes>
    </Layout>
  );
}

export default App;
