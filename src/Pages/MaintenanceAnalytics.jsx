import {
  FaClipboardList,
  FaExclamationTriangle,
  FaHourglassHalf,
  FaWrench,
} from "react-icons/fa";
import { FaCircleCheck } from "react-icons/fa6";
import { useEffect, useState } from "react";
import { ref, onValue } from "firebase/database";
import { db } from "../services/firebase";
import { useNavigate } from "react-router-dom";

/* -------------------------
   Date & Status Helpers
------------------------- */
function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function daysUntil(dateIso) {
  if (!dateIso) return Infinity;
  const n = startOfDay(new Date(dateIso));
  const now = startOfDay(new Date());
  return Math.round((n - now) / (1000 * 60 * 60 * 24));
}

function computeStatus(task) {
  const diff = daysUntil(task.nextServiceDate);

  if (diff < 0) return "overdue";
  if (diff === 0) return "ongoing"; // Due today
  if (diff <= 3) return "upcoming";
  return "pending";
}


/* -------------------------
   Analytics Dashboard
------------------------- */
export default function MaintenanceAnalytics() {
  const navigate = useNavigate();
  const [stats, setStats] = useState({
    total: 0,
    completed: 0,
    ongoing: 0,
    upcoming: 0,
    overdue: 0,
  });

  useEffect(() => {
    const refTasks = ref(db, "maintenanceSchedule");

    return onValue(refTasks, (snap) => {
      const data = snap.val() || {};
      const tasks = Object.values(data);

     const counts = {
       total: tasks.length,
       completed: 0,
       ongoing: 0,
       upcoming: 0,
       overdue: 0,
     };


      tasks.forEach((task) => {
        const status = computeStatus(task);
        if (counts[status] !== undefined) {
          counts[status]++;
        }
      });

      setStats(counts);
    });
  }, []);

  const Card = ({ title, value, subtitle, icon: Icon, color, onClick }) => (
    <div
      onClick={onClick}
      className="border border-gray-300 p-5 flex flex-col gap-3 rounded-2xl shadow-xl
                 hover:bg-gray-100 hover:cursor-pointer transition"
    >
      <div className="flex justify-between items-center">
        <h1 className="font-semibold">{title}</h1>
        <span className={color}>
          <Icon />
        </span>
      </div>
      <p className={`text-3xl font-black ${color}`}>{value}</p>
      <p className="text-sm font-light">{subtitle}</p>
    </div>
  );

  return (
    <div className="min-h-screen p-8 bg-gray-50">
      <div className="w-full max-w-6xl mx-auto">
        <h1 className="font-bold text-2xl mb-2">
          Maintenance Analytics Overview
        </h1>

        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-2 gap-6 mt-2 py-8">
          {/* Total */}
          <Card
            title="Total Scheduled Maintenance Activities"
            value={stats.total}
            subtitle="All scheduled maintenance records"
            icon={FaClipboardList}
            color="text-blue-600"
            onClick={() => navigate("/workschedule")}
          />

          {/* Completed 
          <Card
            title="Completed"
            value={stats.completed}
            subtitle="Successfully serviced tasks"
            icon={FaCircleCheck}
            color="text-green-600"
            onClick={() => navigate("/workschedule?status=completed")}
          /> */}

          {/* Ongoing / Due Today */}
          <Card
            title="Due Today"
            value={stats.ongoing}
            subtitle="Maintenance requiring action today"
            icon={FaWrench}
            color="text-purple-600"
            onClick={() => navigate("/workschedule?status=ongoing")}
          />

          {/* Upcoming */}
          <Card
            title="Upcoming"
            value={stats.upcoming}
            subtitle="Scheduled maintenance activities due in the next 3 days"
            icon={FaHourglassHalf}
            color="text-amber-500"
            onClick={() => navigate("/workschedule?status=upcoming")}
          />

          {/* Overdue */}
          <Card
            title="Overdue"
            value={stats.overdue}
            subtitle="Requires immediate attention"
            icon={FaExclamationTriangle}
            color="text-red-600"
            onClick={() => navigate("/workschedule?status=overdue")}
          />
        </div>
      </div>
    </div>
  );
}
