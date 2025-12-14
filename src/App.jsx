import {
  BrowserRouter as Router,
  Routes,
  Route,
  Navigate,
} from "react-router-dom";
import Sidebar from "./components/Sidebar";
import Topbar from "./components/Topbar";
import WorkOrders from "./Pages/WorkOrders";
import MachineInventory from "./Pages/MachineInventory";
import WorkSchedule from "./Pages/WorkSchedule";

function App() {
  return (
    <Router>
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
              <Route path="/" element={<Navigate to="/workorders" replace />} />
              <Route path="/workorders" element={<WorkOrders />} />
              <Route path="/machineinventory" element={<MachineInventory />} />
              <Route path="/workschedule" element={<WorkSchedule />} />
            </Routes>
          </main>
        </div>
      </div>
    </Router>
  );
}

export default App;
