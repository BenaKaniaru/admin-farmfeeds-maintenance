import { useEffect, useState, useMemo } from "react";
import { ref, onValue, set, remove, update } from "firebase/database";
import { db } from "../services/firebase";
import { motion, AnimatePresence } from "framer-motion";

function MaintenanceHistory() {
  const [orders, setOrders] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);
  const [expandedCards, setExpandedCards] = useState({});

  const defaultForm = {
    title: "",
    description: "",
    machine: "",
    location: "",
    activityType: "",
    projectLead: "",
    assignedPersonnel: [],
    startedOn: "",
    completionDate: "",
    partsUsed: [],
    observations: "",
    laborHours: "",
  };

  const [form, setForm] = useState({ ...defaultForm });
  const [sortOrder, setSortOrder] = useState("latest");
  const [searchQuery, setSearchQuery] = useState("");

  const activityOptions = [
    "Routine Maintenance",
    "Preventive Maintenance",
    "Corrective Maintenance",
    "Inspection",
    "Calibration",
    "Emergency Repair",
  ];

  useEffect(() => {
    document.body.style.overflow = showModal ? "hidden" : "auto";
  }, [showModal]);

  useEffect(() => {
    const ordersRef = ref(db, "maintenanceHistory");
    onValue(ordersRef, (snapshot) => {
      const data = snapshot.val() || {};
      const formatted = Object.entries(data).map(([key, value]) => ({
        firebaseKey: key,
        ...value,
      }));
      setOrders(formatted);
    });
  }, []);

  const resetForm = () => {
    setForm({ ...defaultForm });
    setEditingOrder(null);
  };

  const saveOrder = () => {
    if (!form.title.trim() || !form.machine.trim()) return;

    const payload = {
      ...form,
      assignedPersonnel: Array.isArray(form.assignedPersonnel)
        ? form.assignedPersonnel
        : form.assignedPersonnel
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean),

      partsUsed: Array.isArray(form.partsUsed)
        ? form.partsUsed
        : form.partsUsed
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean),

      completedAt:
        form.completionDate || new Date().toISOString().split("T")[0],
    };

    if (editingOrder) {
      update(
        ref(db, "maintenanceHistory/" + editingOrder.firebaseKey),
        payload
      ).then(() => {
        resetForm();
        setShowModal(false);
      });
    } else {
      const key = Date.now();
      set(ref(db, "maintenanceHistory/" + key), payload).then(() => {
        resetForm();
        setShowModal(false);
      });
    }
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    remove(ref(db, "maintenanceHistory/" + deleteTarget.firebaseKey));
    setDeleteTarget(null);
  };

  const filteredOrders = useMemo(() => {
    return orders
      .filter((o) => {
        const q = searchQuery.toLowerCase();
        return (
          (o.title || "").toLowerCase().includes(q) ||
          (o.machine || "").toLowerCase().includes(q) ||
          (o.location || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) =>
        sortOrder === "latest"
          ? new Date(b.completedAt) - new Date(a.completedAt)
          : new Date(a.completedAt) - new Date(b.completedAt)
      );
  }, [orders, searchQuery, sortOrder]);

  const formatLabel = (key) => {
    const map = {
      startedOn: "Start Date",
      completionDate: "Completion Date",
      partsUsed: "Parts / Materials Used",
      observations: "Observations / Findings",
      laborHours: "Downtime / Labor Hours",
      projectLead: "Supervisor / Project Lead",
      activityType: "Activity Type",
    };
    return (
      map[key] ||
      key.replace(/([A-Z])/g, " $1").replace(/\b\w/g, (c) => c.toUpperCase())
    );
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    return new Intl.DateTimeFormat("en-GB", {
      day: "2-digit",
      month: "short",
      year: "numeric",
    }).format(new Date(dateStr));
  };

  const excludeKeys = ["firebaseKey", "completedAt", "title", "description"];

  const toggleCard = (key) => {
    setExpandedCards((prev) => ({
      ...prev,
      [key]: !prev[key],
    }));
  };

  return (
    <div className="p-4 sm:p-6 bg-gray-50 min-h-screen">
      <h2 className="text-xl sm:text-2xl md:text-3xl font-bold mb-4 sm:mb-6 text-gray-800">
        Maintenance History
      </h2>

      {/* Search & Sort */}
      <div className="flex flex-col md:flex-row gap-4 mb-6">
        <input
          type="text"
          placeholder="Search machine, title, location..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="border px-3 py-2 rounded w-full text-sm sm:text-base"
        />
        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          className="border px-3 py-2 rounded w-full sm:w-auto text-sm sm:text-base"
        >
          <option value="latest">Latest First</option>
          <option value="oldest">Oldest First</option>
        </select>
      </div>

      {/* Add Button */}
      <button
        onClick={() => {
          resetForm();
          setShowModal(true);
        }}
        className="fixed bottom-4 right-4 sm:bottom-6 sm:right-6 
           bg-blue-600 text-white w-12 h-12 sm:w-14 sm:h-14 
           rounded-full shadow-lg text-2xl sm:text-3xl z-20"
      >
        +
      </button>

      {/* History Cards */}
      <div className="grid gap-6">
        {filteredOrders.length === 0 ? (
          <p className="text-gray-500 text-center">
            No maintenance history recorded.
          </p>
        ) : (
          filteredOrders.map((wo) => {
            const isExpanded = expandedCards[wo.firebaseKey];

            return (
              <motion.div
                key={wo.firebaseKey}
                layout
                initial={{ opacity: 0, scale: 0.95 }}
                animate={{ opacity: 1, scale: 1 }}
                exit={{ opacity: 0, scale: 0.95 }}
                whileHover={{ boxShadow: "0px 8px 15px rgba(0,0,0,0.15)" }}
                className={`bg-white p-5 rounded-2xl transition-all border cursor-pointer ${
                  isExpanded ? "bg-gray-50 border-blue-300" : "border-gray-200"
                }`}
                onClick={() => toggleCard(wo.firebaseKey)}
              >
                {/* Minimal Info */}
                <div className="flex justify-between items-center">
                  <div>
                    <h3 className="text-base sm:text-lg font-semibold text-gray-800">
                      {wo.title}
                    </h3>
                    <p className="text-xs sm:text-sm text-gray-600">
                      {wo.machine} | {wo.location}
                    </p>
                    {!isExpanded && (
                      <p className="text-[11px] sm:text-xs text-blue-400 mt-1 italic">
                        Click for more details
                      </p>
                    )}
                  </div>
                  <span className="text-gray-500">
                    {isExpanded ? "▲" : "▼"}
                  </span>
                </div>

                {/* Expanded Info */}
                <AnimatePresence>
                  {isExpanded && (
                    <motion.div
                      initial={{ opacity: 0, height: 0 }}
                      animate={{ opacity: 1, height: "auto" }}
                      exit={{ opacity: 0, height: 0 }}
                      transition={{ duration: 0.3 }}
                      className="mt-4 text-xs sm:text-sm text-gray-700 leading-relaxed"
                    >
                      <p className="mb-2">{wo.description}</p>

                      <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4">
                        {Object.entries(wo)
                          .filter(
                            ([key, value]) =>
                              value && !excludeKeys.includes(key)
                          )
                          .map(([key, value]) => (
                            <div key={key}>
                              <h4 className="font-semibold text-xs sm:text-sm">
                                {formatLabel(key)}
                              </h4>
                              {Array.isArray(value) ? (
                                <ul className="list-disc list-inside border rounded p-2">
                                  {value.map((item, idx) => (
                                    <li key={idx}>{item}</li>
                                  ))}
                                </ul>
                              ) : (
                                <p className="border rounded p-2 text-xs sm:text-sm">
                                  {key.toLowerCase().includes("date")
                                    ? formatDate(value)
                                    : value}
                                </p>
                              )}
                            </div>
                          ))}
                      </div>

                      <div className="flex gap-3 mt-5">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setForm({ ...wo });
                            setEditingOrder(wo);
                            setShowModal(true);
                          }}
                          className="px-4 py-2 text-xs sm:text-sm bg-blue-500 hover:bg-blue-300 cursor-pointer text-white rounded"
                        >
                          Edit
                        </button>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            setDeleteTarget(wo);
                          }}
                          className="px-4 py-2 text-xs sm:text-sm bg-red-500 hover:bg-red-300 text-white cursor-pointer rounded"
                        >
                          Delete
                        </button>
                      </div>
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.div>
            );
          })
        )}
      </div>

      {/* Modal */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center px-3 sm:px-4">
          <div
            className="absolute inset-0 bg-black/40"
            onClick={() => setShowModal(false)}
          />
          <div className="relative bg-white rounded-2xl w-full max-w-3xl max-h-[90vh] flex flex-col shadow-lg">
            <div className="flex items-center justify-between p-4 border-b sticky top-0 bg-white z-10">
              <h3 className="text-lg sm:text-2xl font-bold">
                {editingOrder
                  ? "Edit Maintenance Record"
                  : "Add Maintenance Record"}
              </h3>
              <button
                onClick={() => setShowModal(false)}
                className="text-gray-500 hover:text-gray-800 text-xl font-bold"
              >
                ×
              </button>
            </div>

            <div className="flex-1 overflow-y-auto px-4 py-4">
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                {/* Title */}
                <div>
                  <label className="font-medium block mb-1">Title</label>
                  <input
                    type="text"
                    value={form.title}
                    onChange={(e) =>
                      setForm({ ...form, title: e.target.value })
                    }
                    className="border px-3 py-2 rounded w-full text-sm sm:text-base"
                  />
                </div>

                {/* Machine */}
                <div>
                  <label className="font-medium block mb-1">Machine</label>
                  <input
                    type="text"
                    value={form.machine}
                    onChange={(e) =>
                      setForm({ ...form, machine: e.target.value })
                    }
                    className="border px-3 py-2 rounded w-full text-sm sm:text-base"
                  />
                </div>

                {/* Location */}
                <div>
                  <label className="font-medium block mb-1">Location</label>
                  <input
                    type="text"
                    value={form.location}
                    onChange={(e) =>
                      setForm({ ...form, location: e.target.value })
                    }
                    className="border px-3 py-2 rounded w-full text-sm sm:text-base"
                    placeholder="e.g 0 meter, 6 meter..."
                  />
                </div>

                {/* Activity Type */}
                <div>
                  <label className="font-medium block mb-1">
                    Activity Type
                  </label>
                  <select
                    value={form.activityType}
                    onChange={(e) =>
                      setForm({ ...form, activityType: e.target.value })
                    }
                    className="border px-3 py-2 rounded w-full text-sm sm:text-base"
                  >
                    <option value="">Select type...</option>
                    {activityOptions.map((type) => (
                      <option key={type} value={type}>
                        {type}
                      </option>
                    ))}
                  </select>
                </div>

                {/* Start Date */}
                <div>
                  <label className="font-medium block mb-1">Start Date</label>
                  <input
                    type="date"
                    value={form.startedOn}
                    onChange={(e) =>
                      setForm({ ...form, startedOn: e.target.value })
                    }
                    className="border px-3 py-2 rounded w-full text-sm sm:text-base"
                  />
                </div>

                {/* Completion Date */}
                <div>
                  <label className="font-medium block mb-1">
                    Completion Date
                  </label>
                  <input
                    type="date"
                    value={form.completionDate}
                    onChange={(e) =>
                      setForm({ ...form, completionDate: e.target.value })
                    }
                    className="border px-3 py-2 rounded w-full text-sm sm:text-base"
                  />
                </div>

                {/* Project Lead */}
                <div>
                  <label className="font-medium block mb-1">Project Lead</label>
                  <input
                    type="text"
                    value={form.projectLead}
                    onChange={(e) =>
                      setForm({ ...form, projectLead: e.target.value })
                    }
                    className="border px-3 py-2 rounded w-full text-sm sm:text-base"
                  />
                </div>

                {/* Assigned Personnel */}
                <div>
                  <label className="font-medium block mb-1">
                    Assigned Personnel
                  </label>
                  <input
                    type="text"
                    value={
                      Array.isArray(form.assignedPersonnel)
                        ? form.assignedPersonnel.join(", ")
                        : form.assignedPersonnel
                    }
                    onChange={(e) =>
                      setForm({ ...form, assignedPersonnel: e.target.value })
                    }
                    placeholder="For two or more, separate with commas"
                    className="border px-3 py-2 rounded w-full text-sm sm:text-base"
                  />
                </div>

                {/* Parts Used */}
                <div>
                  <label className="font-medium block mb-1">
                    Parts / Materials Used
                  </label>
                  <input
                    type="text"
                    value={
                      Array.isArray(form.partsUsed)
                        ? form.partsUsed.join(", ")
                        : form.partsUsed
                    }
                    onChange={(e) =>
                      setForm({ ...form, partsUsed: e.target.value })
                    }
                    placeholder="For two or more, separate with commas"
                    className="border px-3 py-2 rounded w-full text-sm sm:text-base"
                  />
                </div>

                {/* Labor Hours */}
                <div>
                  <label className="font-medium block mb-1">
                    Downtime / Labor Hours
                  </label>
                  <input
                    type="text"
                    value={form.laborHours}
                    onChange={(e) =>
                      setForm({ ...form, laborHours: e.target.value })
                    }
                    className="border px-3 py-2 rounded w-full text-sm sm:text-base"
                  />
                </div>

                {/* Observations */}
                <div className="sm:col-span-2">
                  <label className="font-medium block mb-1">
                    Observations / Findings
                  </label>
                  <textarea
                    value={form.observations}
                    onChange={(e) =>
                      setForm({ ...form, observations: e.target.value })
                    }
                    className="border px-3 py-2 rounded w-full min-h-80px] text-sm sm:text-base"
                  />
                </div>

                {/* Description */}
                <div className="sm:col-span-2">
                  <label className="font-medium block mb-1">Description</label>
                  <textarea
                    value={form.description}
                    onChange={(e) =>
                      setForm({ ...form, description: e.target.value })
                    }
                    className="border px-3 py-2 rounded w-full min-h-80px] text-sm sm:text-base"
                  />
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="flex flex-col sm:flex-row justify-end gap-3 p-4 border-t bg-white sticky bottom-0">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-300 rounded w-full sm:w-auto"
              >
                Cancel
              </button>
              <button
                onClick={saveOrder}
                className="px-4 py-2 bg-blue-600 text-white rounded w-full sm:w-auto"
              >
                Save
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRM */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center">
          <div className="bg-white p-6 rounded-lg text-center">
            <p className="mb-4 text-sm sm:text-base">
              Delete record <strong>{deleteTarget.title}</strong>?
            </p>
            <div className="flex gap-4 justify-center">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 text-sm bg-gray-300 rounded"
              >
                Cancel
              </button>
              <button
                onClick={confirmDelete}
                className="px-4 py-2 text-sm bg-red-600 text-white rounded"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default MaintenanceHistory;
