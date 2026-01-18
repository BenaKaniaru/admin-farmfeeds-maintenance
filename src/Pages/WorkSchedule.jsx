// MaintenanceSchedule.jsx
import React, { useEffect, useState } from "react";
import { ref, onValue, push, update, remove } from "firebase/database";
import { useSearchParams } from "react-router-dom";
import { db } from "../services/firebase";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  CalendarCheck,
  Bell,
  AlertTriangle,
  Calendar,
} from "lucide-react";
import FullCalendar from "@fullcalendar/react";
import dayGridPlugin from "@fullcalendar/daygrid";
import timeGridPlugin from "@fullcalendar/timegrid";
import interactionPlugin from "@fullcalendar/interaction";


/* -------------------------
   Constants & Date Helpers
------------------------- */
const CATEGORIES = ["Weekly", "Monthly", "Half-Year", "Yearly"];
const PRIORITIES = ["Low", "Medium", "High", "Critical"];
const ACTIVITY_TYPES = ["Preventive", "Corrective", "Predictive", "Breakdown"];
const DOWNTIME_OPTIONS = ["No", "Yes - Minor", "Yes - Major"];
const THRESHOLDS = { Weekly: 2, Monthly: 7, "Half-Year": 30, Yearly: 30 };


function todayISO() {
  const d = new Date();
  return d.toISOString().split("T")[0];
}

function startOfDay(date) {
  const d = new Date(date);
  d.setHours(0, 0, 0, 0);
  return d;
}

function addMonths(dateIso, months) {
  const d = new Date(dateIso);
  const day = d.getDate();
  d.setMonth(d.getMonth() + months);
  if (d.getDate() !== day) d.setDate(0);
  return d.toISOString().split("T")[0];
}

function addDays(dateIso, days) {
  const d = new Date(dateIso);
  d.setDate(d.getDate() + days);
  return d.toISOString().split("T")[0];
}

function computeNextFrom(baseIso, category) {
  if (!baseIso) baseIso = todayISO();
  switch (category) {
    case "Weekly":
      return addDays(baseIso, 7);
    case "Monthly":
      return addMonths(baseIso, 1);
    case "Half-Year":
      return addMonths(baseIso, 6);
    case "Yearly":
      return addMonths(baseIso, 12);
    default:
      return addDays(baseIso, 7);
  }
}

function formatDateLabel(iso) {
  if (!iso) return "—";
  try {
    return new Intl.DateTimeFormat("en-GB", {
      year: "numeric",
      month: "short",
      day: "numeric",
    }).format(new Date(iso));
  } catch {
    return iso;
  }
}

function daysUntil(dateIso) {
  if (!dateIso) return Infinity;
  const n = startOfDay(new Date(dateIso));
  const now = startOfDay(new Date());
  const diff = Math.round((n - now) / (1000 * 60 * 60 * 24));
  return diff;
}


function computeStatus(task) {
  const next = task?.nextServiceDate || null;
  if (!next) return "nodate";

  const diff = daysUntil(next);
  if (diff < 0) return "overdue";
  if (diff === 0) return "ongoing"; // internal key
  if (diff <= 3) return "upcoming";
  return "pending";
}



function mapTasksToEvents(tasks, machine, category) {
  return Object.entries(tasks)
    .filter(([_, t]) => t.nextServiceDate)
    .filter(([_, t]) => (machine ? t.machine === machine : true))
    .filter(([_, t]) =>
      category ? (t.category || "Weekly") === category : true
    )
    .map(([key, t]) => ({
      id: key,
      title: t.taskName || t.name || "Maintenance Task",
      start: t.nextServiceDate,
      allDay: true,
      extendedProps: t,
    }));
}


/* -------------------------
   Small UI Pieces
------------------------- */
function SectionHeader({ title }) {
  return (
    <div className="flex items-center w-full my-6 select-none">
      <div className="flex-1 h-[1px] bg-gradient-to-r from-gray-300 to-gray-200" />
      <span className="px-4 py-1 mx-3 text-sm md:text-base font-semibold text-gray-700 bg-white rounded-full shadow-sm border border-gray-200">
        {title}
      </span>
      <div className="flex-1 h-[1px] bg-gradient-to-l from-gray-300 to-gray-200" />
    </div>
  );
}

function statusLabel(status) {
  switch (status) {
    case "overdue":
      return "Overdue";
    case "ongoing":
      return "Due Today";
    case "upcoming":
      return "Upcoming";
    case "pending":
      return "Pending";
    default:
      return "—";
  }
}


/* Task Card */
function TaskCard({
  task,
  machines,
  onEdit,
  onDelete,
  onComplete,
  allowEarlyMark,
}) {
  const status = computeStatus(task);
  const next = task.nextServiceDate || null;
  const daysLeft = next ? daysUntil(next) : Infinity;
  const threshold = THRESHOLDS[task.category || "Weekly"] ?? 2;
  const isDisabled = !allowEarlyMark && daysLeft > threshold;

  const badgeClass =
    status === "Overdue"
      ? "bg-red-100 text-red-700"
      : status === "ongoing"
      ? "bg-yellow-100 text-yellow-700"
      : status === "Upcoming"
      ? "bg-orange-100 text-orange-700"
      : "bg-gray-100 text-gray-700";

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      className="bg-white border border-gray-200 rounded-2xl p-5 shadow-sm hover:shadow-lg flex flex-col transition"
    >
      {/* Header: Name + Status + Priority */}
      <div className="flex justify-between items-start gap-3 mb-2">
        <div className="flex-1">
          <div className="flex items-center gap-2 flex-wrap">
            <h3 className="text-sm font-semibold text-gray-800">
              {task.taskName || task.name}
            </h3>
            <span
              className={`text-xs px-2 py-0.5 rounded-full font-medium ${badgeClass}`}
            >
              {statusLabel(status)}
            </span>

            <span className="text-xs px-2 py-0.5 rounded-full bg-blue-100 text-blue-700">
              {task.priority || "Medium"}
            </span>
          </div>

          <div className="mt-1 text-xs text-gray-500">
            {daysLeft >= 0 ? `${daysLeft} day(s) left` : "Overdue"}
            {task.activityType && ` • ${task.activityType}`}
          </div>
        </div>

        {/* Edit/Delete Buttons */}
        <div className="flex flex-col gap-2 ml-2">
          <button
            onClick={onEdit}
            className="p-1 rounded-md hover:bg-gray-100 transition"
          >
            <Edit2 size={16} />
          </button>
          <button
            onClick={onDelete}
            className="p-1 rounded-md hover:bg-gray-100 transition"
          >
            <Trash2 size={16} />
          </button>
        </div>
      </div>

      {/* Info Grid */}
      <div className="mt-2 text-xs text-gray-600 grid grid-cols-1 sm:grid-cols-2 gap-2 wrap-break-word">
        <div>
          <strong className="text-gray-700">Machine:</strong>{" "}
          <span className="text-gray-600">
            {(machines && machines[task.machine]?.name) || task.machine || "—"}
          </span>
        </div>
        <div>
          <strong className="text-gray-700">Downtime Required:</strong>{" "}
          <span
            className={`font-medium ${
              task.downtimeRequired === "Yes - Major"
                ? "text-red-600"
                : task.downtimeRequired === "Yes - Minor"
                ? "text-orange-600"
                : "text-gray-800"
            }`}
          >
            {task.downtimeRequired || "No"}
          </span>
        </div>
        <div>
          <strong className="text-gray-700">Last Service:</strong>{" "}
          <span className="text-gray-600">
            {task.lastServiceDate ? formatDateLabel(task.lastServiceDate) : "—"}
          </span>
        </div>
        <div>
          <strong className="text-gray-700">Next Service:</strong>{" "}
          <span className="text-gray-600">
            {task.nextServiceDate ? formatDateLabel(task.nextServiceDate) : "—"}
          </span>
        </div>
        {task.location && (
          <div>
            <strong className="text-gray-700">Location:</strong>{" "}
            <span className="text-gray-600">{task.location}</span>
          </div>
        )}
        {task.estimatedManHours && (
          <div>
            <strong className="text-gray-700">Est. Hours:</strong>{" "}
            <span className="text-gray-600">{task.estimatedManHours}</span>
          </div>
        )}
      </div>

      {/* Checklists & Instructions */}
      {task.maintenanceChecklist && (
        <details className="mt-3 text-xs text-gray-600">
          <summary className="cursor-pointer font-medium">Checklist</summary>
          <div className="mt-2 prose-sm max-w-none text-gray-700 whitespace-pre-line">
            {task.maintenanceChecklist}
          </div>
        </details>
      )}

      {task.description && (
        <details className="mt-3 text-xs text-gray-600">
          <summary className="cursor-pointer font-medium">Instructions</summary>
          <div className="mt-2 prose-sm max-w-none text-gray-700">
            {task.description}
          </div>
        </details>
      )}

      {task.riskIfNotDone && (
        <div className="mt-3 p-2 bg-red-50 border border-red-200 rounded">
          <strong className="text-xs text-red-700">Risk if not done:</strong>
          <p className="text-xs text-red-600 mt-1">{task.riskIfNotDone}</p>
        </div>
      )}

      {/* Complete Button */}
      <div className="mt-4 flex justify-center">
        <button
          onClick={onComplete}
          disabled={isDisabled}
          className={`w-full md:w-2/3 px-4 py-2 rounded-xl flex items-center justify-center gap-2 font-medium transition ${
            !isDisabled
              ? "bg-green-600 text-white hover:bg-green-700 cursor-pointer"
              : "bg-gray-200 text-gray-500 cursor-not-allowed"
          }`}
        >
          <CalendarCheck size={16} />
          {isDisabled ? "Completed" : "Mark as Complete"}
        </button>
      </div>
    </motion.div>
  );
}



/* -------------------------
   Main Component
------------------------- */
export default function MaintenanceSchedule() {
  const [tasks, setTasks] = useState({});
  const [machines, setMachines] = useState({});
  const [query, setQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingKey, setEditingKey] = useState(null);
  const [form, setForm] = useState(getEmptyForm());
  const [deleteKey, setDeleteKey] = useState(null);
  const [confirmEarly, setConfirmEarly] = useState({
    open: false,
    taskKey: null,
    message: "",
  });
  const [categoryCounts, setCategoryCounts] = useState({});
  const [calendarView, setCalendarView] = useState(false);
  const [calendarMachine, setCalendarMachine] = useState("");
  const [calendarCategory, setCalendarCategory] = useState("");
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  const [selectedFrequency, setSelectedFrequency] = useState("all");


  const [searchParams] = useSearchParams();
  const filterStatus = searchParams.get("status"); // e.g. overdue, upcoming

  useEffect(() => {
    const onResize = () => setIsMobile(window.innerWidth < 640);
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, []);

  useEffect(() => {
    const tasksRef = ref(db, "maintenanceSchedule");
    const unsubTasks = onValue(tasksRef, (snap) => setTasks(snap.val() || {}));
    const machinesRef = ref(db, "machines");
    const unsubMachines = onValue(machinesRef, (snap) =>
      setMachines(snap.val() || {})
    );
    return () => {
      unsubTasks();
      unsubMachines();
    };
  }, []);

  useEffect(() => {
    const flat = Object.entries(tasks).map(([k, v]) => ({ key: k, ...v }));
    const catCounts = { Weekly: 0, Monthly: 0, "Half-Year": 0, Yearly: 0 };
    flat.forEach((t) => {
      const cat = t.category || "Weekly";
      catCounts[cat] = (catCounts[cat] || 0) + 1;
    });
    setCategoryCounts(catCounts);
  }, [tasks]);

  useEffect(() => {
    document.body.style.overflow =
      showModal || deleteKey || confirmEarly.open ? "hidden" : "auto";
    return () => (document.body.style.overflow = "auto");
  }, [showModal, deleteKey, confirmEarly.open]);

  /* -------------------------
     CRUD
  ------------------------- */
  async function saveTask(e) {
    e && e.preventDefault();
    if (!form.taskName || !form.category)
      return alert("Please provide task name and frequency.");
    const next =
      form.nextServiceDate ||
      computeNextFrom(form.createdAt || todayISO(), form.category);
    const payload = {
      ...form,
      nextServiceDate: next,
      createdAt: form.createdAt || todayISO(),
    };
    try {
      if (editingKey)
        await update(ref(db, `maintenanceSchedule/${editingKey}`), payload);
      else await push(ref(db, "maintenanceSchedule"), payload);
      setShowModal(false);
      setEditingKey(null);
      setForm(getEmptyForm());
    } catch (err) {
      console.error(err);
      alert("Could not save task.");
    }
  }

  async function removeTask(key) {
    try {
      await remove(ref(db, `maintenanceSchedule/${key}`));
      setDeleteKey(null);
    } catch (err) {
      console.error(err);
      alert("Could not delete task.");
    }
  }

  async function handleCompleteClick(task) {
    // Use stored nextServiceDate if available
    const next =
      task.nextServiceDate ||
      computeNextFrom(task.lastServiceDate || todayISO(), task.category);

    // Days left from today to nextServiceDate
    const daysLeft = daysUntil(next);

    if (daysLeft > 0) {
      // Task is early → ask for confirmation
      setConfirmEarly({
        open: true,
        taskKey: task.key,
        message: `Task is not yet due. Next service is in ${daysLeft} day(s). Are you sure you want to mark as COMPLETED?`,
      });
    } else {
      // Task is due or overdue → complete directly
      await doComplete(task.key, task);
    }
  }

  async function doComplete(key, task) {
    const today = todayISO();
    const next = computeNextFrom(today, task.category || "Weekly");
    try {
      await update(ref(db, `maintenanceSchedule/${key}`), {
        lastServiceDate: today,
        nextServiceDate: next,
      });
      setConfirmEarly({ open: false, taskKey: null, message: "" });
    } catch (err) {
      console.error(err);
      alert("Failed to mark complete.");
    }
  }

  /* -------------------------
     Add / Edit helpers
  ------------------------- */
  function openAdd() {
    setEditingKey(null);
    setForm(getEmptyForm());
    setShowModal(true);
  }

  function openEditTask(key) {
    const t = tasks[key];
    if (!t) return;
    setEditingKey(key);
    setForm({ ...getEmptyForm(), ...t });
    setShowModal(true);
  }

  /* -------------------------
     Filtering / Grouping
  ------------------------- */
  const flat = Object.entries(tasks).map(([k, v]) => ({ key: k, ...v }));
  const filtered = flat.filter((t) => {
    /* 🔍 text search */
    const q = query.trim().toLowerCase();
    if (q) {
      const hay = `${t.taskName || t.name || ""} ${t.description || ""} ${
        t.machine || ""
      } ${t.location || ""}`.toLowerCase();
      if (!hay.includes(q)) return false;
    }

    /* 🎯 status filter from analytics */
    if (filterStatus) {
      if (computeStatus(t) !== filterStatus) return false;
    }

    /* 🗓️ frequency filter */
    if (selectedFrequency !== "all") {
      if ((t.category || "Weekly") !== selectedFrequency) return false;
    }

    return true;
  });

  const grouped = CATEGORIES.reduce((acc, c) => {
    acc[c] = filtered.filter((t) => (t.category || "Weekly") === c);
    return acc;
  }, {});

  /* -------------------------
     Render
  ------------------------- */
  if (calendarView) {
    return (
      <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
        <div className="max-w-7xl mx-auto bg-white rounded-xl p-4 shadow-sm">
          {/* Calendar Filters */}
          <div className="flex flex-wrap gap-3 mb-4">
            <select
              value={calendarMachine}
              onChange={(e) => setCalendarMachine(e.target.value)}
              className="border rounded px-3 py-2 text-sm"
            >
              <option value="">All Machines</option>
              {Object.entries(machines).map(([k, v]) => (
                <option key={k} value={k}>
                  {v.name || v.code || k}
                </option>
              ))}
            </select>

            <select
              value={calendarCategory}
              onChange={(e) => setCalendarCategory(e.target.value)}
              className="border rounded px-3 py-2 text-sm"
            >
              <option value="">All Frequencies</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>

            <button
              onClick={() => setCalendarView(false)}
              className="ml-auto px-3 py-2 text-sm rounded bg-gray-100 hover:bg-gray-200"
            >
              Back to List
            </button>
          </div>
          <div className="overflow-x-auto">
            <FullCalendar
              plugins={[dayGridPlugin, timeGridPlugin, interactionPlugin]}
              initialView="dayGridMonth"
              editable
              height={isMobile ? "auto" : 650} // auto height on mobile
              aspectRatio={isMobile ? 0.85 : 1.6} // compact on small screens
              contentHeight="auto"
              headerToolbar={{
                left: "prev,next today",
                center: "title",
                right: isMobile
                  ? "dayGridMonth"
                  : "dayGridMonth,timeGridWeek,timeGridDay",
              }}
              
              events={mapTasksToEvents(
                filtered.reduce((acc, t) => {
                  acc[t.key] = t;
                  return acc;
                }, {}),
                calendarMachine,
                calendarCategory
              )}

              eventClick={(info) => openEditTask(info.event.id)}
              eventDrop={async (info) => {
                try {
                  await update(
                    ref(db, `maintenanceSchedule/${info.event.id}`),
                    {
                      nextServiceDate: info.event.startStr,
                    }
                  );
                } catch {
                  info.revert();
                  alert("Failed to reschedule task");
                }
              }}
              eventClassNames={(arg) => {
                const { priority, nextServiceDate } = arg.event.extendedProps;
                const diff = daysUntil(nextServiceDate);

                if (diff < 0) return ["bg-red-700", "text-white"];
                if (diff === 0) return ["bg-yellow-600", "text-white"];

                if (priority === "Critical") return ["bg-red-500"];
                if (priority === "High") return ["bg-orange-500"];
                if (priority === "Medium") return ["bg-yellow-500"];
                return ["bg-green-600"];
              }}
              dayMaxEvents={isMobile ? 3 : undefined} // limit number of events displayed per day on mobile
              navLinks={!isMobile} // allow clicking week/day links only on desktop
              windowResize={(view) => setIsMobile(window.innerWidth < 640)}
            />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <div className="flex flex-col sm:flex-row sm:justify-between sm:items-center gap-3 mb-3">
          <h1 className="text-2xl font-bold text-gray-800">
            Maintenance Schedule
          </h1>
          <button
            onClick={() => setCalendarView(true)}
            className="px-4 py-2 rounded bg-gray-100 hover:bg-gray-200 flex items-center gap-2 text-gray-700"
          >
            <Calendar size={16} /> Calendar
          </button>
        </div>
        <div className="flex flex-row gap-4 mb-6 items-stretch md:items-center">
          <div className="flex-1">
            <Search className="absolute left-4 top-3 text-gray-400" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder="Search tasks, machine, location or assignee..."
              className="pl-8 pr-4 py-3 border rounded-xl w-full text-sm shadow-sm"
            />
          </div>

          {/* Frequency Filter */}
          <div className="flex flex-wrap pl-4 items-center  p-1">
            <select
              value={selectedFrequency}
              onChange={(e) => setSelectedFrequency(e.target.value)}
              className="py-3 border rounded-xl w-full text-sm shadow-sm"
            >
              <option value="all">All</option>
              {CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c}
                </option>
              ))}
            </select>
          </div>
        </div>

        {CATEGORIES.map((cat) => (
          <section key={cat} className="mb-8">
            <SectionHeader title={`${cat} Maintenance`} />
            <div className="grid grid-cols-1 lg:grid-cols-2 xl:grid-cols-3 2xl:grid-cols-4 gap-5">
              {grouped[cat] && grouped[cat].length > 0 ? (
                grouped[cat].map((t) => (
                  <TaskCard
                    key={t.key}
                    task={t}
                    machines={machines}
                    onEdit={() => openEditTask(t.key)}
                    onDelete={() => setDeleteKey(t.key)}
                    onComplete={() => handleCompleteClick(t)}
                    allowEarlyMark={false}
                  />
                ))
              ) : (
                <div className="col-span-full">
                  <div className="bg-white border border-dashed border-gray-200 rounded-xl p-8 text-center text-gray-500">
                    No {cat.toLowerCase()} tasks yet — add one with the button
                    below.
                  </div>
                </div>
              )}
            </div>
          </section>
        ))}

        {/* Floating Add Button */}
        <motion.button
          onClick={openAdd}
          initial={{ scale: 0, opacity: 0 }}
          animate={{ scale: 1, opacity: 1 }}
          whileHover={{ scale: 1.08 }}
          transition={{ type: "spring", stiffness: 260, damping: 20 }}
          className="fixed bottom-6 right-6 bg-green-600 text-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center text-2xl z-50 cursor-pointer"
          aria-label="Add Task"
        >
          <Plus size={22} />
        </motion.button>

        {/* -------------------------
           Add/Edit Modal
        ------------------------- */}
        <AnimatePresence>
          {showModal && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div
                className="absolute inset-0 bg-black/40 backdrop-blur-sm cursor-pointer"
                onClick={() => {
                  setShowModal(false);
                  setEditingKey(null);
                }}
              />

              <motion.form
                onSubmit={saveTask}
                initial={{ y: 12, opacity: 0, scale: 0.98 }}
                animate={{ y: 0, opacity: 1, scale: 1 }}
                exit={{ y: 12, opacity: 0, scale: 0.98 }}
                onClick={(e) => e.stopPropagation()}
                className="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl max-h-[90vh] overflow-y-auto p-6 z-50"
              >
                <div className="flex items-center justify-between mb-3">
                  <h2 className="text-lg font-semibold">
                    {editingKey ? "Edit Task" : "Add Task"}
                  </h2>
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingKey(null);
                    }}
                    className="text-gray-500 px-2 py-1 rounded hover:bg-gray-100 cursor-pointer"
                  >
                    Close
                  </button>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Task Name */}
                  <div className="flex flex-col">
                    <label className="text-xs text-gray-600 mb-1">
                      Task Name *
                    </label>
                    <input
                      value={form.taskName}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, taskName: e.target.value }))
                      }
                      className="border rounded px-3 py-2 cursor-text"
                      required
                      placeholder="Enter task name"
                    />
                  </div>

                  {/* Category/Frequency */}
                  <div className="flex flex-col">
                    <label className="text-xs text-gray-600 mb-1">
                      Frequency *
                    </label>
                    <select
                      value={form.category}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, category: e.target.value }))
                      }
                      className="border rounded px-3 py-2 cursor-pointer"
                    >
                      {CATEGORIES.map((c) => (
                        <option key={c} value={c}>
                          {c}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Activity Type */}
                  <div className="flex flex-col">
                    <label className="text-xs text-gray-600 mb-1">
                      Activity Type
                    </label>
                    <select
                      value={form.activityType}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, activityType: e.target.value }))
                      }
                      className="border rounded px-3 py-2 cursor-pointer"
                    >
                      {ACTIVITY_TYPES.map((type) => (
                        <option key={type} value={type}>
                          {type}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Priority */}
                  <div className="flex flex-col">
                    <label className="text-xs text-gray-600 mb-1">
                      Priority
                    </label>
                    <select
                      value={form.priority}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, priority: e.target.value }))
                      }
                      className="border rounded px-3 py-2 cursor-pointer"
                    >
                      {PRIORITIES.map((p) => (
                        <option key={p} value={p}>
                          {p}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Machine */}

                  <div className="flex flex-col">
                    <label className="text-xs text-gray-600 mb-1">
                      Machine
                    </label>
                    <input
                      value={form.machine}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, machine: e.target.value }))
                      }
                      className="border rounded px-3 py-2 cursor-text"
                      placeholder="e.g., Hammer Mill"
                    />
                  </div>

                  {/* Location */}
                  <div className="flex flex-col">
                    <label className="text-xs text-gray-600 mb-1">
                      Location
                    </label>
                    <input
                      value={form.location}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, location: e.target.value }))
                      }
                      className="border rounded px-3 py-2 cursor-text"
                      placeholder="e.g., 0 meter"
                    />
                  </div>

                  {/* Estimated Man Hours */}
                  <div className="flex flex-col">
                    <label className="text-xs text-gray-600 mb-1">
                      Estimated Man Hours
                    </label>
                    <input
                      value={form.estimatedManHours}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          estimatedManHours: e.target.value,
                        }))
                      }
                      className="border rounded px-3 py-2 cursor-text"
                      placeholder="e.g., 1 hour, 30 minutes..."
                      type="text"
                    />
                  </div>

                  {/* Downtime Required */}
                  <div className="flex flex-col">
                    <label className="text-xs text-gray-600 mb-1">
                      Downtime Required
                    </label>
                    <select
                      value={form.downtimeRequired}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          downtimeRequired: e.target.value,
                        }))
                      }
                      className="border rounded px-3 py-2 cursor-pointer"
                    >
                      {DOWNTIME_OPTIONS.map((option) => (
                        <option key={option} value={option}>
                          {option}
                        </option>
                      ))}
                    </select>
                  </div>

                  {/* Next Service Date */}
                  <div className="flex flex-col">
                    <label className="text-xs text-gray-600 mb-1">
                      Next Service Date
                    </label>
                    <input
                      type="date"
                      value={form.nextServiceDate || ""}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          nextServiceDate: e.target.value,
                        }))
                      }
                      className="border rounded px-3 py-2 cursor-pointer"
                    />
                  </div>

                  {/* Last Service Date */}
                  <div className="flex flex-col">
                    <label className="text-xs text-gray-600 mb-1">
                      Last Service Date
                    </label>
                    <input
                      type="date"
                      value={form.lastServiceDate || ""}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          lastServiceDate: e.target.value,
                        }))
                      }
                      className="border rounded px-3 py-2 cursor-pointer"
                    />
                  </div>

                  {/* Maintenance Checklist */}
                  <div className="md:col-span-2">
                    <label className="text-xs text-gray-600 mb-1">
                      Maintenance Checklist
                    </label>
                    <textarea
                      value={form.maintenanceChecklist}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          maintenanceChecklist: e.target.value,
                        }))
                      }
                      className="border rounded px-3 py-2 w-full min-h-[100px] cursor-text"
                      placeholder="Enter step-by-step checklist items (one per line)"
                    />
                  </div>

                  {/* Description */}
                  <div className="md:col-span-2">
                    <label className="text-xs text-gray-600 mb-1">
                      Description / Instructions
                    </label>
                    <textarea
                      value={form.description}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, description: e.target.value }))
                      }
                      className="border rounded px-3 py-2 w-full min-h-[100px] cursor-text"
                      placeholder="Additional instructions or notes..."
                    />
                  </div>

                  {/* Risk if Not Done */}
                  <div className="md:col-span-2">
                    <label className="text-xs text-gray-600 mb-1">
                      Risk if Not Done
                    </label>
                    <textarea
                      value={form.riskIfNotDone}
                      onChange={(e) =>
                        setForm((f) => ({
                          ...f,
                          riskIfNotDone: e.target.value,
                        }))
                      }
                      className="border rounded px-3 py-2 w-full min-h-[80px] cursor-text"
                      placeholder="Describe potential risks or consequences if this maintenance is not performed..."
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => {
                      setShowModal(false);
                      setEditingKey(null);
                    }}
                    className="px-4 py-2 rounded bg-gray-200 hover:bg-gray-300 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded bg-green-600 text-white hover:bg-green-700 cursor-pointer"
                  >
                    {editingKey ? "Save" : "Create"}
                  </button>
                </div>
              </motion.form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete Modal */}
        <AnimatePresence>
          {deleteKey && (
            <motion.div
              className="fixed inset-0 z-50 flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div
                className="absolute inset-0 bg-black/40"
                onClick={() => setDeleteKey(null)}
              />
              <motion.div className="relative bg-white rounded-xl shadow-xl p-6 z-50 w-full max-w-md">
                <h3 className="text-lg font-semibold mb-3">Delete task?</h3>
                <p className="text-sm text-gray-600 mb-4">
                  This action will permanently remove the task.
                </p>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setDeleteKey(null)}
                    className="px-4 py-2 rounded bg-gray-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => removeTask(deleteKey)}
                    className="px-4 py-2 rounded bg-red-600 text-white cursor-pointer"
                  >
                    Delete
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Early-completion confirmation modal */}
        <AnimatePresence>
          {confirmEarly.open && (
            <motion.div
              className="fixed inset-0 z-60 flex items-center justify-center p-4"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
            >
              <div
                className="absolute inset-0 bg-black/40"
                onClick={() =>
                  setConfirmEarly({ open: false, taskKey: null, message: "" })
                }
              />
              <motion.div className="relative bg-white rounded-xl shadow-xl p-6 z-50 w-full max-w-lg">
                <div className="flex items-start gap-3">
                  <AlertTriangle size={20} className="text-yellow-600" />
                  <div>
                    <h3 className="text-lg font-semibold">
                      Mark as Completed — Not Due Yet
                    </h3>
                    <p className="text-sm text-gray-600 mt-2">
                      {confirmEarly.message}
                    </p>
                  </div>
                </div>
                <div className="flex justify-end gap-3 mt-6">
                  <button
                    onClick={() =>
                      setConfirmEarly({
                        open: false,
                        taskKey: null,
                        message: "",
                      })
                    }
                    className="px-4 py-2 rounded bg-gray-200 cursor-pointer"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={async () => {
                      const key = confirmEarly.taskKey;
                      const t = tasks[key];
                      if (!t)
                        return setConfirmEarly({
                          open: false,
                          taskKey: null,
                          message: "",
                        });
                      await doComplete(key, t);
                    }}
                    className="px-4 py-2 rounded bg-green-600 text-white cursor-pointer"
                  >
                    Mark Anyway
                  </button>
                </div>
              </motion.div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}

/* -------------------------
   Utilities
------------------------- */
function getEmptyForm() {
  return {
    taskName: "",
    category: "Weekly",
    activityType: "Preventive",
    machine: "",
    location: "",
    estimatedManHours: "",
    downtimeRequired: "No",
    maintenanceChecklist: "",
    nextServiceDate: "",
    lastServiceDate: "",
    priority: "Medium",
    riskIfNotDone: "",
    description: "",
    createdAt: todayISO(),
  };
}
