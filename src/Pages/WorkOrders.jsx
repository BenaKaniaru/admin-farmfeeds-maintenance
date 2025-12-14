import { useEffect, useState, useMemo } from "react";
import { ref, onValue, set, remove, update } from "firebase/database";
import { db } from "../services/firebase";

function WorkOrdersList() {
  const [orders, setOrders] = useState([]);
  const [showModal, setShowModal] = useState(false);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [editingOrder, setEditingOrder] = useState(null);

  const defaultForm = {
    title: "",
    description: "",
    machine: "",
    location: "",
    priority: "medium",
    status: "upcoming",
    activityType: "",
    projectLead: "",
    assignedPersonnel: "",
    startedOn: "",
    completionDate: "",
  };

  const [form, setForm] = useState({ ...defaultForm });
  const [statusFilter, setStatusFilter] = useState("all");
  const [sortOrder, setSortOrder] = useState("latest");
  const [searchQuery, setSearchQuery] = useState("");

  useEffect(() => {
    document.body.style.overflow = showModal ? "hidden" : "auto";
  }, [showModal]);

  // Fetch work orders from Firebase
  useEffect(() => {
    const ordersRef = ref(db, "workOrders");
    onValue(ordersRef, (snapshot) => {
      const data = snapshot.val() || {};
      const formattedOrders = Object.entries(data).map(([key, value]) => ({
        firebaseKey: key,
        ...value,
      }));
      setOrders(formattedOrders);
    });
  }, []);

  const resetForm = () => {
    setForm({ ...defaultForm });
    setEditingOrder(null);
  };

  const saveOrder = () => {
    if (!form.title.trim()) return;

    const formData = { ...form };
    if (!editingOrder) {
      formData.createdAt = new Date().toISOString().split("T")[0];
    }

    if (editingOrder) {
      update(ref(db, "workOrders/" + editingOrder.firebaseKey), formData).then(
        () => {
          resetForm();
          setShowModal(false);
        }
      );
    } else {
      const key = Date.now();
      set(ref(db, "workOrders/" + key), formData).then(() => {
        resetForm();
        setShowModal(false);
      });
    }
  };

  const confirmDelete = () => {
    if (!deleteTarget) return;
    remove(ref(db, "workOrders/" + deleteTarget.firebaseKey));
    setDeleteTarget(null);
  };

  const filteredOrders = useMemo(() => {
    return orders
      .filter((wo) =>
        statusFilter === "all"
          ? true
          : wo.status?.toLowerCase() === statusFilter.toLowerCase()
      )
      .filter((wo) => {
        const q = searchQuery.toLowerCase();
        return (
          (wo.title || "").toLowerCase().includes(q) ||
          (wo.machine || "").toLowerCase().includes(q) ||
          (wo.location || "").toLowerCase().includes(q)
        );
      })
      .sort((a, b) =>
        sortOrder === "latest"
          ? new Date(b.createdAt) - new Date(a.createdAt)
          : new Date(a.createdAt) - new Date(b.createdAt)
      );
  }, [orders, statusFilter, searchQuery, sortOrder]);

  const badgeClasses = {
    status: {
      completed: "bg-green-100 text-green-700",
      ongoing: "bg-purple-100 text-purple-700",
      upcoming: "bg-amber-100 text-amber-700",
      overdue: "bg-red-100 text-red-700",
    },
    priority: {
      low: "bg-green-100 text-green-700",
      medium: "bg-yellow-100 text-yellow-700",
      high: "bg-red-100 text-red-700",
    },
  };

  const formatLabel = (key) => {
    if (key === "startedOn") return "Start Date";
    if (key === "completionDate") return "Completion Date";
    return key
      .replace(/([A-Z])/g, " $1")
      .replace(/_/g, " ")
      .replace(/\b\w/g, (c) => c.toUpperCase());
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return "—";
    try {
      return new Intl.DateTimeFormat("en-US", {
        year: "numeric",
        month: "short",
        day: "numeric",
      }).format(new Date(dateStr));
    } catch {
      return dateStr;
    }
  };

  const excludeKeys = [
    "id",
    "firebaseKey",
    "createdAt",
    "title",
    "description",
    "status",
    "priority",
    "activityType",
  ];

  return (
    <div className="p-6 bg-gray-50 min-h-screen">
      <h2 className="text-3xl font-bold mb-6 text-gray-800">Work Orders</h2>

      {/* Filters */}
      <div className="flex flex-col md:flex-row md:items-center gap-4 mb-6">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="border p-2 rounded w-full md:w-auto"
        >
          <option value="all">All Orders</option>
          <option value="completed">Completed</option>
          <option value="ongoing">Ongoing</option>
          <option value="upcoming">Upcoming</option>
          <option value="overdue">Overdue</option>
        </select>

        <select
          value={sortOrder}
          onChange={(e) => setSortOrder(e.target.value)}
          className="border p-2 rounded w-full md:w-auto"
        >
          <option value="latest">Latest First</option>
          <option value="oldest">Oldest First</option>
        </select>

        <input
          type="text"
          placeholder="Search..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="border p-2 rounded w-full md:flex-1"
        />
      </div>

      {/* Add Button */}
      <button
        onClick={() => {
          resetForm();
          setShowModal(true);
        }}
        className="fixed bottom-6 right-6 bg-blue-600 text-white w-14 h-14 rounded-full shadow-lg flex items-center justify-center text-3xl z-20 hover:bg-blue-700 transition"
      >
        +
      </button>

      {/* Work Orders List */}
      <div className="grid gap-6 mt-6">
        {filteredOrders.length === 0 ? (
          <p className="text-gray-500 text-center">No work orders found.</p>
        ) : (
          filteredOrders.map((wo) => (
            <div
              key={wo.firebaseKey}
              className="bg-white p-5 shadow-md rounded-lg hover:shadow-lg transition relative z-10"
            >
              <div className="flex justify-between items-start">
                <h3 className="text-xl font-semibold text-gray-800">
                  {wo.title}
                </h3>
                <div className="flex gap-2">
                  {wo.status && (
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        badgeClasses.status[wo.status.toLowerCase()]
                      }`}
                    >
                      {wo.status}
                    </span>
                  )}
                  {wo.priority && (
                    <span
                      className={`px-2 py-1 rounded-full text-xs font-medium ${
                        badgeClasses.priority[wo.priority.toLowerCase()]
                      }`}
                    >
                      {wo.priority}
                    </span>
                  )}
                  {wo.activityType && (
                    <span className="px-2 py-1 rounded-full text-xs font-medium bg-slate-100 text-slate-800">
                      {wo.activityType}
                    </span>
                  )}
                </div>
              </div>

              {wo.description && (
                <p className="text-gray-700 mt-2">{wo.description}</p>
              )}

              {/* Dynamic Details */}
              <div className="grid md:grid-cols-2 gap-4 mt-3 text-sm text-gray-600">
                {Object.entries(wo)
                  .filter(
                    ([key, value]) =>
                      !excludeKeys.includes(key) &&
                      value &&
                      ![
                        "assignedPersonnel",
                        "startedOn",
                        "completionDate",
                      ].includes(key)
                  )
                  .map(([key, value]) => (
                    <div key={key}>
                      <h4 className="font-semibold">{formatLabel(key)}</h4>
                      <p className="border rounded p-2">
                        {key.toLowerCase().includes("date")
                          ? formatDate(value)
                          : value}
                      </p>
                    </div>
                  ))}

                {wo.assignedPersonnel && (
                  <div>
                    <h4 className="font-semibold">Assigned Personnel</h4>
                    <p className="border rounded p-2">{wo.assignedPersonnel}</p>
                  </div>
                )}
                {wo.startedOn && (
                  <div>
                    <h4 className="font-semibold">Start Date</h4>
                    <p className="border rounded p-2">
                      {formatDate(wo.startedOn)}
                    </p>
                  </div>
                )}
                {wo.completionDate && (
                  <div>
                    <h4 className="font-semibold">Completion Date</h4>
                    <p className="border rounded p-2">
                      {formatDate(wo.completionDate)}
                    </p>
                  </div>
                )}
              </div>

              {/* Buttons */}
              <div className="flex gap-3 mt-4">
                <button
                  onClick={() => {
                    setForm({ ...wo });
                    setEditingOrder(wo);
                    setShowModal(true);
                  }}
                  className="px-4 py-1 bg-yellow-500 text-white rounded hover:bg-yellow-600 transition"
                >
                  Edit
                </button>
                <button
                  onClick={() => setDeleteTarget(wo)}
                  className="px-4 py-1 bg-red-600 text-white rounded hover:bg-red-700 transition"
                >
                  Delete
                </button>
              </div>
            </div>
          ))
        )}
      </div>

      {/* ADD / EDIT MODAL */}
      {showModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4">
          <div className="absolute inset-0 bg-black/40 backdrop-blur-sm"></div>
          <div className="relative bg-white rounded-lg shadow-lg w-full max-w-3xl max-h-[90vh] flex flex-col z-10 overflow-auto p-6">
            <button
              onClick={() => setShowModal(false)}
              className="absolute top-3 right-3 text-gray-500 hover:text-gray-800 font-bold text-xl"
            >
              ×
            </button>
            <h3 className="text-2xl font-bold mb-4">
              {editingOrder ? "Edit Work Order" : "Add Work Order"}
            </h3>

            <div className="grid md:grid-cols-2 gap-4">
              {/* Consistent Fields */}
              {[
                { key: "title", type: "text" },
                { key: "machine", type: "text" },
                { key: "location", type: "text" },
                {
                  key: "priority",
                  type: "select",
                  options: ["low", "medium", "high"],
                },
                {
                  key: "status",
                  type: "select",
                  options: ["upcoming", "ongoing", "completed", "overdue"],
                },
                { key: "activityType", type: "text" },
                { key: "projectLead", type: "text" },
                { key: "assignedPersonnel", type: "text" },
                { key: "startedOn", type: "date" },
                { key: "completionDate", type: "date" },
              ].map(({ key, type, options }) => (
                <div key={key} className="flex flex-col">
                  <label className="text-sm font-medium mb-1">
                    {formatLabel(key)}
                  </label>
                  {type === "text" && (
                    <input
                      type="text"
                      value={form[key]}
                      onChange={(e) =>
                        setForm({ ...form, [key]: e.target.value })
                      }
                      className="border p-2 rounded w-full"
                    />
                  )}
                  {type === "date" && (
                    <input
                      type="date"
                      value={form[key]}
                      onChange={(e) =>
                        setForm({ ...form, [key]: e.target.value })
                      }
                      className="border p-2 rounded w-full"
                    />
                  )}
                  {type === "select" && (
                    <select
                      value={form[key]}
                      onChange={(e) =>
                        setForm({ ...form, [key]: e.target.value })
                      }
                      className="border p-2 rounded w-full"
                    >
                      {options.map((o) => (
                        <option key={o} value={o}>
                          {o}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              ))}

              {/* Description */}
              <div className="md:col-span-2 flex flex-col">
                <label className="text-sm font-medium mb-1">Description</label>
                <textarea
                  value={form.description}
                  onChange={(e) =>
                    setForm({ ...form, description: e.target.value })
                  }
                  rows={3}
                  className="border p-2 rounded w-full"
                />
              </div>
            </div>

            <div className="flex justify-end gap-3 mt-4">
              <button
                onClick={() => setShowModal(false)}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 transition"
              >
                Cancel
              </button>
              <button
                onClick={saveOrder}
                className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 transition"
              >
                {editingOrder ? "Update" : "Add"}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* DELETE CONFIRMATION MODAL */}
      {deleteTarget && (
        <div className="fixed inset-0 bg-black/40 flex items-center justify-center z-50">
          <div className="bg-white p-6 rounded-lg shadow-lg w-full max-w-md text-center">
            <h3 className="text-xl font-semibold mb-3">Delete Work Order?</h3>
            <p className="text-gray-600 mb-6">
              Are you sure you want to delete{" "}
              <strong>{deleteTarget.title}</strong>?
            </p>

            <div className="flex justify-center gap-4">
              <button
                onClick={() => setDeleteTarget(null)}
                className="px-4 py-2 bg-gray-300 rounded hover:bg-gray-400 transition"
              >
                Cancel
              </button>

              <button
                onClick={confirmDelete}
                className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition"
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

export default WorkOrdersList;
