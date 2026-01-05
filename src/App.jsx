import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import MaintenanceHistory from "./Pages/MaintenanceHistory";
import MachineInventory from "./Pages/MachineInventory";
import WorkSchedule from "./Pages/WorkSchedule";
import SparePartsInventory from "./Pages/SparePartsInventory";
import MaintenanceAnalytics from "./Pages/MaintenanceAnalytics";

function App() {
  return (
    <div>
      <div className="flex w-full h-screen bg-gray-100 overflow-hidden">
        {/* Sidebar */}
        <Sidebar />

        {/* Main Content Area */}
        <div className="flex-1 flex flex-col relative pl-20 md:pl-64">
          {/* Topbar */}
          <Topbar />

          {/* Scrollable Page Content */}
          <main className="flex-1 mt-16 p-6 overflow-y-auto">
            <Routes>
              <Route
                path="/"
                element={<Navigate to="/maintenanceanlytics" replace />}
              />
              <Route
                path="/maintenanceanalytics"
                element={<MaintenanceAnalytics />}
              />
              <Route
                path="/maintenancehistory"
                element={<MaintenanceHistory />}
              />
              <Route path="/machineinventory" element={<MachineInventory />} />
              <Route path="/workschedule" element={<WorkSchedule />} />
              <Route path="/spareparts" element={<SparePartsInventory />} />
            </Routes>
          </main>
        </div>
      </div>
    </div>
  );
}

export default App;
