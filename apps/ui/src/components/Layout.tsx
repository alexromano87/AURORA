import { Link, useLocation } from 'react-router-dom';
import { useEffect } from 'react';
import {
  LayoutDashboard,
  FileText,
  Briefcase,
  ArrowRightLeft,
  Bell,
  TrendingUp,
  Database,
  Wallet,
  Receipt,
  Lightbulb,
  Sparkles,
  Command,
  Radar,
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();
  const isPersonalFinance =
    location.pathname.startsWith('/personal-finance') ||
    location.pathname.startsWith('/bank-accounts') ||
    location.pathname.startsWith('/personal-transactions') ||
    location.pathname.startsWith('/purchase-advisor');
  const themeClass = isPersonalFinance ? 'theme-personal' : 'theme-invest';

  useEffect(() => {
    document.body.classList.remove('theme-personal', 'theme-invest');
    document.body.classList.add(themeClass);
  }, [themeClass]);

  const investmentNavItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/ips', label: 'IPS', icon: FileText },
    { path: '/portfolios', label: 'Portfolios', icon: Briefcase },
    { path: '/transactions', label: 'Transactions', icon: ArrowRightLeft },
    { path: '/instruments', label: 'Instruments', icon: Database },
    { path: '/engine', label: 'Engine', icon: TrendingUp },
    { path: '/alerts', label: 'Alerts', icon: Bell },
  ];

  const personalFinanceNavItems = [
    { path: '/personal-finance', label: 'Finanza', icon: Wallet },
    { path: '/personal-transactions', label: 'Transazioni', icon: Receipt },
    { path: '/purchase-advisor', label: 'Advisor', icon: Lightbulb },
  ];

  return (
    <div className={`aurora-shell aurora-grid relative min-h-screen overflow-hidden ${themeClass}`}>
      <div className="pointer-events-none absolute inset-0">
        <div className="absolute -left-24 top-10 h-64 w-64 rounded-full bg-[radial-gradient(circle_at_center,_rgba(244,110,57,0.45),_rgba(244,110,57,0))] blur-2xl animate-float" />
        <div className="absolute right-[-120px] top-32 h-72 w-72 rounded-full bg-[radial-gradient(circle_at_center,_rgba(28,174,200,0.45),_rgba(28,174,200,0))] blur-2xl animate-drift" />
        <div className="absolute bottom-[-160px] left-[35%] h-96 w-96 rounded-full bg-[radial-gradient(circle_at_center,_rgba(63,99,221,0.35),_rgba(63,99,221,0))] blur-3xl animate-drift" />
      </div>

      <header className="relative z-10 mx-auto w-full max-w-7xl px-6 pt-8">
        <div className="glass-panel-strong flex flex-col gap-6 p-6">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-center lg:justify-between">
            <div className="flex items-center gap-3">
              <div className="flex h-12 w-12 items-center justify-center rounded-2xl bg-foreground text-white shadow-[0_12px_30px_rgba(31,43,77,0.35)]">
                <TrendingUp className="h-6 w-6" />
              </div>
              <div>
                <p className="text-sm uppercase tracking-[0.3em] text-foreground/50">Aurora OS</p>
                <h1 className="section-title">AURORA</h1>
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-3">
              <div className="chip flex items-center gap-2">
                <Radar className="h-3.5 w-3.5" />
                Live pulse
              </div>
              <button className="cta-button flex items-center gap-2">
                <Sparkles className="h-4 w-4" />
                Run Engine
              </button>
              <div className="flex items-center gap-2 rounded-full border border-white/70 bg-white/80 px-4 py-2 text-sm text-foreground/70">
                <Command className="h-4 w-4" />
                / Command
              </div>
            </div>
          </div>

          <div className="flex flex-wrap items-center gap-4">
            <div className="flex items-center gap-3">
              <span className="chip">Invest</span>
              {investmentNavItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`nav-pill ${isActive ? 'nav-pill-active' : 'nav-pill-idle'}`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
            <div className="hidden h-6 w-px bg-border lg:block" />
            <div className="flex flex-wrap items-center gap-3">
              <span className="chip">Personal</span>
              {personalFinanceNavItems.map((item) => {
                const Icon = item.icon;
                const isActive =
                  location.pathname === item.path ||
                  (item.path === '/personal-finance' && location.pathname === '/bank-accounts');
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`nav-pill ${isActive ? 'nav-pill-active' : 'nav-pill-idle'}`}
                  >
                    <Icon className="h-4 w-4" />
                    <span>{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <div className="stat-card">
              <p className="stat-title">Portfolio Momentum</p>
              <p className="mt-3 text-2xl font-semibold text-foreground">+4.8% MTD</p>
              <p className="mt-2 text-sm text-foreground/60">Drift dentro banda, nessuna vendita.</p>
            </div>
            <div className="stat-card">
              <p className="stat-title">Monthly PAC</p>
              <p className="mt-3 text-2xl font-semibold text-foreground">€200 pronto</p>
              <p className="mt-2 text-sm text-foreground/60">Prossimo acquisto al primo giorno utile.</p>
            </div>
            <div className="stat-card">
              <p className="stat-title">Alert Focus</p>
              <p className="mt-3 text-2xl font-semibold text-foreground">3 segnali</p>
              <p className="mt-2 text-sm text-foreground/60">Solo alert ad alta rilevanza.</p>
            </div>
          </div>
        </div>
      </header>

      <main className="relative z-10 mx-auto w-full max-w-7xl px-6 pb-16 pt-10">
        <div className="animate-reveal">{children}</div>
      </main>
    </div>
  );
}
