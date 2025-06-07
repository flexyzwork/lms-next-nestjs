'use client';

import NonDashboardNavbar from '@/components/NonDashboardNavbar';
import Landing from '@/app/(nondashboard)/landing/page';
import Footer from '@/components/Footer';
import { useAuthRefresh } from '@/hooks/useAuth';

export default function Home() {
  useAuthRefresh();
  return (
    <div className="nondashboard-layout">
      <NonDashboardNavbar />
      <main className="nondashboard-layout__main">
        <Landing />
      </main>
      <Footer />
    </div>
  );
}
