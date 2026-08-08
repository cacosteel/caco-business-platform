import DashboardStat from "../../../components/workspace/dashboard/DashboardStat";
import DashboardCard from "../../../components/workspace/dashboard/DashboardCard";
import RecentActivity from "../../../components/workspace/dashboard/RecentActivity";
import QuickActions from "../../../components/workspace/dashboard/QuickActions";

import OrdersChart from "../../../components/workspace/charts/OrdersChart";
import SalesChart from "../../../components/workspace/charts/SalesChart";
import InquiryChart from "../../../components/workspace/charts/InquiryChart";

import RecentOrders from "../../../services/widgets/RecentOrders";
import RecentQuotations from "../../../services/widgets/RecentQuotations";
import RecentInquiries from "../../../services/widgets/RecentInquiries";
import Notifications from "../../../services/widgets/Notifications";
import Tasks from "../../../services/widgets/Tasks";

import { useDashboard } from "../../../hooks/useDashboard";

export default function DashboardHome() {
  const { loading, stats } = useDashboard();

  if (loading) {
    return <div className="p-6">Loading...</div>;
  }

  return (
    <div className="space-y-6 p-6">

      <div className="grid grid-cols-4 gap-6">

        <DashboardStat
          title="Companies"
          value={stats.companies}
        />

        <DashboardStat
          title="Inquiries"
          value={stats.inquiries}
        />

        <DashboardStat
          title="Quotations"
          value={stats.quotations}
        />

        <DashboardStat
          title="Orders"
          value={stats.orders}
        />

      </div>

      <div className="grid grid-cols-3 gap-6">

        <DashboardCard title="Orders">
          <OrdersChart />
        </DashboardCard>

        <DashboardCard title="Sales">
          <SalesChart />
        </DashboardCard>

        <DashboardCard title="Inquiries">
          <InquiryChart />
        </DashboardCard>

      </div>

      <div className="grid grid-cols-3 gap-6">

        <RecentOrders />

        <RecentQuotations />

        <RecentInquiries />

      </div>

      <div className="grid grid-cols-3 gap-6">

        <div className="col-span-2">

          <DashboardCard title="Recent Activity">
            <RecentActivity />
          </DashboardCard>

        </div>

        <DashboardCard title="Quick Actions">
          <QuickActions />
        </DashboardCard>

      </div>

      <div className="grid grid-cols-2 gap-6">

        <Notifications />

        <Tasks />

      </div>

    </div>
  );
}
