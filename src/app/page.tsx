import { Suspense } from "react";
import MajorOrderDashboard from "../../components/majorOrderDashboard";
import DashboardSuspense from "../../components/dashboardSuspense";

export default async function HomepageDashboard() {
  return (
    <div className="m-5">
      <Suspense fallback={<DashboardSuspense></DashboardSuspense>}>
        <MajorOrderDashboard></MajorOrderDashboard>
      </Suspense>
    </div>
  );
}
