import { useEffect, useState, useRef } from "react";
import { ref, onValue, push, remove, update } from "firebase/database";
import { db } from "../services/firebase";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search,
  Plus,
  Edit2,
  Trash2,
  X,
  ChevronDown,
  ChevronUp,
} from "lucide-react";

export default function MachineInventory({ sidebarWidth = 256 }) {
  const [machines, setMachines] = useState({});
  const [search, setSearch] = useState("");
  const [showForm, setShowForm] = useState(false);
  const [formData, setFormData] = useState(initialFormState());
  const [editingMachine, setEditingMachine] = useState(null); // firebase key when editing
  const [deleteTarget, setDeleteTarget] = useState(null); // firebase key to delete
  const [expanded, setExpanded] = useState({}); // Track expanded state per machine
  const inventoryRef = useRef(null);

  // Disable page scroll when modal open
  useEffect(() => {
    if (showForm || deleteTarget) document.body.style.overflow = "hidden";
    else document.body.style.overflow = "auto";
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [showForm, deleteTarget]);

  // Subscribe to Firebase machines
  useEffect(() => {
    const machinesRef = ref(db, "machines");
    return onValue(machinesRef, (snapshot) => {
      setMachines(snapshot.val() || {});
    });
  }, []);

  // ---------- Helpers ----------
  function initialFormState() {
    return {
      name: "",
      serialNumber: "",
      code: "",
      category: "",
      location: "",
      manufacturer: "",
      model: "",
      powerRating: "",
      voltage: "",
      current: "",
      frequency: "",
      rpm: "",
      status: "",
      condition: "",
      manufactureYear: "",
      accessories: [],
    };
  }

  const labelFor = (field) =>
    field.replace(/([A-Z])/g, " $1").replace(/\b\w/g, (l) => l.toUpperCase());

  // ---------- CRUD handlers ----------
  function openAdd() {
    setEditingMachine(null);
    setFormData(initialFormState());
    setShowForm(true);
  }

  function openEdit(key, machineObj) {
    setEditingMachine(key);
    // Ensure accessories array exists to avoid runtime errors
    setFormData({
      ...initialFormState(),
      ...machineObj,
      accessories: Array.isArray(machineObj?.accessories)
        ? machineObj.accessories
        : [],
    });
    setShowForm(true);
  }

  function openDelete(key) {
    setDeleteTarget(key);
  }

  function cancelDelete() {
    setDeleteTarget(null);
  }

  async function confirmDelete() {
    if (!deleteTarget) return;
    try {
      await remove(ref(db, "machines/" + deleteTarget));
    } catch (err) {
      console.error("Delete error:", err);
    } finally {
      setDeleteTarget(null);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    // Basic validation: require name and code
    if (!formData.name || !formData.code) {
      alert("Please provide at least Name and Code.");
      return;
    }

    try {
      if (editingMachine) {
        await update(ref(db, "machines/" + editingMachine), formData);
      } else {
        await push(ref(db, "machines"), formData);
      }
    } catch (err) {
      console.error("Save error:", err);
    } finally {
      setShowForm(false);
      setEditingMachine(null);
      setFormData(initialFormState());
    }
  }

  // ---------- Accessories helpers ----------
  const addAccessory = (type) => {
    let newAccessory = { type };

    if (type === "Motor") {
      newAccessory = {
        type,
        name: "",
        serialNumber: "",
        manufacturer: "",
        ratedVoltage: "",
        powerRating: "",
        ratedFrequency: "",
        ratedCurrent: "",
        efficiency: "",
        powerFactor: "",
        speed: "",
        ingressProtection: "",
        thermalClass: "",
      };
    } else if (type === "Bearing") {
      newAccessory = { type, bearingType: "", bearingCode: "" };
    } else if (type === "Belt") {
      newAccessory = { type, beltType: "", beltSize: "" };
    } else if (type === "Gear Coupling") {
      newAccessory = {
        type,
        manufacturer: "",
        ratedVoltage: "",
        powerRating: "",
        ratedFrequency: "",
        ratedCurrent: "",
        powerFactor: "",
        torque: "",
        ingressProtection: "",
        insulationClass: "",
        inputSpeed: "",
        outputSpeed: "",
        gearRatio: "",
        recommendedLubricant: "",
      };
    }

    setFormData((prev) => ({
      ...prev,
      accessories: [...(prev.accessories || []), newAccessory],
    }));
  };

  const removeAccessory = (index) => {
    setFormData((prev) => {
      const copy = [...(prev.accessories || [])];
      copy.splice(index, 1);
      return { ...prev, accessories: copy };
    });
  };

  const handleChange = (e) =>
    setFormData((prev) => ({ ...prev, [e.target.name]: e.target.value }));

  const handleAccessoryChange = (index, field, value) => {
    setFormData((prev) => {
      const copy = [...(prev.accessories || [])];
      copy[index] = { ...copy[index], [field]: value };
      return { ...prev, accessories: copy };
    });
  };

  // ---------- Filtering ----------
  const filtered = Object.entries(machines).filter(([key, m]) => {
    const q = search.trim().toLowerCase();
    if (!q) return true;
    return (
      (m.name || "").toLowerCase().includes(q) ||
      (m.code || "").toLowerCase().includes(q) ||
      (m.category || "").toLowerCase().includes(q) ||
      (m.location || "").toLowerCase().includes(q) ||
      (m.manufacturer || "").toLowerCase().includes(q)
    );
  });

  // ---------- UI ----------
  return (
    <div
      className="flex-1 min-h-screen bg-gray-50 p-4 relative overflow-auto"
      ref={inventoryRef}
    >
      <h2 className="font-bold text-2xl mb-4 text-gray-800">
        Machine Inventory
      </h2>

      {/* Search Bar */}
      <div className="flex items-center bg-white shadow-md rounded-xl px-4 py-2 w-full max-w-5xl mx-auto mb-4">
        <Search className="text-gray-500 mr-2" size={20} />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Search by name, code, location..."
          className="outline-none w-full text-gray-700"
        />
      </div>

      {/* Machine Cards */}
      {filtered.length === 0 ? (
        <div className="flex justify-center items-center text-gray-500 py-20">
          No machines found.
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-6">
          {filtered.map(([key, m]) => (
            <motion.div
              key={key}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0 }}
              className="bg-white p-6 rounded-3xl shadow-md border border-gray-200 hover:shadow-lg transition"
            >
              {/* Header */}
              <div className="flex justify-between items-start mb-4">
                <div>
                  <p className="text-xl font-bold text-green-700">{m.name}</p>
                  <p className="text-gray-600 text-sm">
                    Serial Number: {m.serialNumber || "—"}
                  </p>
                  <p className="text-gray-500 text-sm">Code: {m.code}</p>
                </div>

                <div className="flex flex-col gap-2">
                  <button
                    onClick={() => openEdit(key, m)}
                    className="flex items-center bg-yellow-400 text-white px-3 py-1 rounded-xl shadow"
                  >
                    <Edit2 size={16} className="mr-1" /> Edit
                  </button>

                  <button
                    onClick={() => openDelete(key)}
                    className="flex items-center bg-red-500 text-white px-3 py-1 rounded-xl shadow"
                  >
                    <Trash2 size={16} className="mr-1" /> Delete
                  </button>
                </div>
              </div>

              {/* Basic Info Grid */}
              <div className="grid grid-cols-2 gap-2 text-sm text-gray-700 mb-4">
                <p>
                  <strong>Category:</strong> {m.category}
                </p>
                <p>
                  <strong>Location:</strong> {m.location}
                </p>
                <p>
                  <strong>Manufacturer:</strong> {m.manufacturer}
                </p>
                <p>
                  <strong>Model:</strong> {m.model || "—"}
                </p>
                <p>
                  <strong>Power Rating:</strong> {m.powerRating}
                </p>
                <p>
                  <strong>Voltage:</strong> {m.voltage}
                </p>
                <p>
                  <strong>Current:</strong> {m.current}
                </p>
                <p>
                  <strong>Frequency:</strong> {m.frequency}
                </p>
                <p>
                  <strong>RPM:</strong> {m.rpm}
                </p>
                <p>
                  <strong>Status:</strong>
                  <span
                    className={`ml-1 font-semibold ${
                      m.status === "Operational"
                        ? "text-green-600"
                        : m.status === "Under Maintenance"
                        ? "text-yellow-600"
                        : "text-red-600"
                    }`}
                  >
                    {m.status}
                  </span>
                </p>
                <p>
                  <strong>Condition:</strong> {m.condition}
                </p>
                <p>
                  <strong>Year of Manufacture:</strong>{" "}
                  {m.manufactureYear || "—"}
                </p>
              </div>

              {/* Expand Accessories Button */}
              {m.accessories && m.accessories.length > 0 && (
                <div className="mt-3">
                  <button
                    onClick={() =>
                      setExpanded((prev) => ({ ...prev, [key]: !prev[key] }))
                    }
                    className="flex items-center justify-between w-full bg-gray-100 px-3 py-2 rounded-xl hover:bg-gray-200"
                  >
                    <span className="font-semibold text-gray-800">
                      Accessories / Attachments
                    </span>
                    {expanded[key] ? (
                      <ChevronUp size={18} />
                    ) : (
                      <ChevronDown size={18} />
                    )}
                  </button>

                  <AnimatePresence>
                    {expanded[key] && (
                      <motion.div
                        initial={{ height: 0, opacity: 0 }}
                        animate={{ height: "auto", opacity: 1 }}
                        exit={{ height: 0, opacity: 0 }}
                        className="overflow-hidden mt-2 flex flex-col gap-3"
                      >
                        {m.accessories.map((acc, idx) => (
                          <div
                            key={idx}
                            className="bg-gray-50 p-3 rounded-xl border border-gray-200"
                          >
                            <p className="font-medium text-green-700">
                              {acc.name || acc.type}
                            </p>
                            <div className="grid grid-cols-2 gap-2 text-xs text-gray-700 mt-1">
                              {Object.entries(acc)
                                .filter(([k]) => k !== "name" && k !== "type")
                                .map(([k, v]) => (
                                  <p key={k}>
                                    <strong>{labelFor(k)}:</strong> {v || "—"}
                                  </p>
                                ))}
                            </div>
                          </div>
                        ))}
                      </motion.div>
                    )}
                  </AnimatePresence>
                </div>
              )}
            </motion.div>
          ))}
        </div>
      )}

      {/* Form Modal */}
      {/* Form Modal */}
      <AnimatePresence>
        {showForm && (
          <motion.div
            key="form-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 flex justify-center items-center z-50"
          >
            {/* Backdrop */}
            <div className="absolute inset-0 bg-black/20 backdrop-blur-sm" />

            {/* Modal content with slide-down animation */}
            <motion.form
              initial={{ y: -50, opacity: 0, scale: 0.95 }}
              animate={{ y: 0, opacity: 1, scale: 1 }}
              exit={{ y: -50, opacity: 0, scale: 0.95 }}
              transition={{ duration: 0.3 }}
              onSubmit={handleSubmit}
              className="relative bg-white p-6 rounded-2xl w-full max-w-3xl max-h-[85vh] overflow-y-auto grid gap-4 grid-cols-1 md:grid-cols-2 mx-4 z-50 shadow-xl"
            >
              <div className="col-span-full flex justify-between items-center mb-4">
                <h3 className="text-lg font-bold text-gray-800">
                  {editingMachine ? "Edit Machine" : "Add Machine"}
                </h3>
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingMachine(null);
                    setFormData(initialFormState());
                  }}
                  className="text-gray-500"
                >
                  <X size={20} />
                </button>
              </div>

              {/* Machine fields and accessories section remain unchanged */}
              {Object.keys(formData)
                .filter((k) => k !== "accessories")
                .map((field) => (
                  <div key={field} className="flex flex-col">
                    <label className="text-gray-700 font-semibold mb-1">
                      {labelFor(field)}
                    </label>
                    <input
                      name={field}
                      value={formData[field] || ""}
                      onChange={handleChange}
                      className="border border-gray-300 px-2 py-1 rounded-xl"
                      required={field === "name" || field === "code"}
                    />
                  </div>
                ))}

              {/* Accessories section */}
              <div className="col-span-full">
                <h4 className="font-bold text-gray-800 mb-2">Accessories</h4>
                {formData.accessories?.length === 0 && (
                  <div className="text-sm text-gray-500 mb-2">
                    No accessories added yet.
                  </div>
                )}
                {formData.accessories?.map((acc, index) => (
                  <div
                    key={index}
                    className="border p-3 rounded-xl mb-2 relative grid gap-2 grid-cols-1 md:grid-cols-2"
                  >
                    <button
                      type="button"
                      onClick={() => removeAccessory(index)}
                      className="absolute top-2 right-2 text-red-500"
                      aria-label="Remove accessory"
                    >
                      <X size={16} />
                    </button>
                    <div className="col-span-full font-semibold text-gray-800 mb-1">
                      {acc.type} Specifications
                    </div>
                    {/* Accessory fields mapping stays the same */}
                  </div>
                ))}

                <div className="flex gap-2 mt-2">
                  <button
                    type="button"
                    className="bg-blue-600 text-white px-3 py-1 rounded-xl"
                    onClick={() => addAccessory("Motor")}
                  >
                    Add Motor
                  </button>
                  <button
                    type="button"
                    className="bg-green-600 text-white px-3 py-1 rounded-xl"
                    onClick={() => addAccessory("Bearing")}
                  >
                    Add Bearing
                  </button>
                  <button
                    type="button"
                    className="bg-purple-600 text-white px-3 py-1 rounded-xl"
                    onClick={() => addAccessory("Belt")}
                  >
                    Add Belt
                  </button>
                  <button
                    type="button"
                    className="bg-orange-600 text-white px-3 py-1 rounded-xl"
                    onClick={() => addAccessory("Gear Coupling")}
                  >
                    Add Gear Coupling
                  </button>
                </div>
              </div>

              <div className="col-span-full flex justify-end gap-3 mt-2">
                <button
                  type="button"
                  onClick={() => {
                    setShowForm(false);
                    setEditingMachine(null);
                    setFormData(initialFormState());
                  }}
                  className="px-3 py-1 text-gray-600"
                >
                  Cancel
                </button>
                <button className="bg-blue-600 text-white px-4 py-1 rounded-xl shadow">
                  {editingMachine ? "Save" : "Add"}
                </button>
              </div>
            </motion.form>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Delete Modal */}
      <AnimatePresence>
        {deleteTarget && (
          <motion.div
            key="delete-modal"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute top-0 left-0 w-full h-full flex justify-center items-start z-50"
          >
            <div className="absolute inset-0 backdrop-blur-md bg-white/30" />
            <div className="relative bg-white p-6 rounded-2xl w-72 shadow-xl mt-10 z-50">
              <p className="font-bold mb-3 text-gray-800">
                Delete this machine?
              </p>
              <div className="flex justify-end gap-3">
                <button onClick={cancelDelete}>Cancel</button>
                <button
                  onClick={confirmDelete}
                  className="bg-red-600 text-white px-4 py-1 rounded-xl"
                >
                  Delete
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Floating Add Button */}
      <motion.button
        onClick={openAdd}
        className="fixed bottom-6 right-6 bg-blue-600 hover:bg-blue-700 text-white p-4 rounded-full shadow-lg z-50 flex items-center justify-center"
        aria-label="Add machine"
        initial={{ scale: 1 }}
        animate={{ scale: [1, 1.1, 1] }}
        transition={{ duration: 1.5, repeat: Infinity, repeatType: "loop" }}
      >
        <Plus size={24} />
      </motion.button>
    </div>
  );
}
