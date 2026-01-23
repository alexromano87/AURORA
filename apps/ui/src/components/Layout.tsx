import { Link, useLocation } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  Briefcase,
  ArrowRightLeft,
  Bell,
  TrendingUp,
  Database,
  DollarSign,
} from 'lucide-react';

interface LayoutProps {
  children: React.ReactNode;
}

export function Layout({ children }: LayoutProps) {
  const location = useLocation();

  const navItems = [
    { path: '/', label: 'Dashboard', icon: LayoutDashboard },
    { path: '/ips', label: 'IPS', icon: FileText },
    { path: '/portfolios', label: 'Portfolios', icon: Briefcase },
    { path: '/transactions', label: 'Transactions', icon: ArrowRightLeft },
    { path: '/alerts', label: 'Alerts', icon: Bell },
    { path: '/engine', label: 'Engine', icon: TrendingUp },
    { path: '/instruments', label: 'Instruments', icon: Database },
    { path: '/prices', label: 'Prices', icon: DollarSign },
  ];

  return (
    <div className="min-h-screen bg-background">
      <nav className="border-b">
        <div className="container mx-auto px-4">
          <div className="flex h-16 items-center justify-between">
            <div className="flex items-center gap-2">
              <TrendingUp className="h-6 w-6 text-primary" />
              <span className="text-xl font-bold">AURORA</span>
            </div>
            <div className="flex items-center gap-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname === item.path;
                return (
                  <Link
                    key={item.path}
                    to={item.path}
                    className={`flex items-center gap-2 px-4 py-2 rounded-md transition-colors ${
                      isActive
                        ? 'bg-primary text-primary-foreground'
                        : 'hover:bg-accent'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-sm font-medium">{item.label}</span>
                  </Link>
                );
              })}
            </div>
          </div>
        </div>
      </nav>
      <main className="container mx-auto px-4 py-8">{children}</main>
    </div>
  );
}
