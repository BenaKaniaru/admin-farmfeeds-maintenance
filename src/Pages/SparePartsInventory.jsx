import React, { useEffect, useState } from "react";
import { ref, onValue, push, update, remove } from "firebase/database";
import { db } from "../services/firebase";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Plus, Edit2, Trash2, AlertTriangle } from "lucide-react";

/* -------------------------
   Helpers
------------------------- */
const LOW_STOCK_LEVEL = 5;

const CATEGORY_SPEC_HINTS = {
  Electrical:
    "e.g. Voltage rating, Current rating, Power (W/kW), Frequency, Insulation class",
  Mechanical: "e.g. Material, Dimensions, Weight, Tolerance, Speed rating",
  "Welding & Fabrication":
    "e.g. Material type, Thickness, Welding method, Electrode/Filler type",
};

function todayISO() {
  return new Date().toISOString().split("T")[0];
}

function getEmptyForm() {
  return {
    name: "",
    code: "",
    category: "",
    quantity: "",
    location: "",
    manufacturer: "",
    unitPrice: "",
    specs: "",
    notes: "",
    createdAt: todayISO(),
  };
}

/* -------------------------
   Spare Part Card
------------------------- */
function SparePartCard({ part, onEdit, onDelete }) {
  const lowStock = Number(part.quantity) <= LOW_STOCK_LEVEL;

  return (
    <motion.div
      layout
      initial={{ opacity: 0, y: 6 }}
      animate={{ opacity: 1, y: 0 }}
      exit={{ opacity: 0, y: 6 }}
      className="bg-white border rounded-2xl p-4 shadow-sm hover:shadow-md"
    >
      <div className="flex justify-between items-start gap-3">
        <div className="flex-1">
          <div className="flex items-center gap-2">
            <h3 className="text-sm font-semibold text-gray-800">{part.name}</h3>
            {lowStock && (
              <span className="text-xs px-2 py-0.5 rounded-full bg-red-100 text-red-700 font-medium flex items-center gap-1">
                <AlertTriangle size={12} />
                Low stock
              </span>
            )}
          </div>

          <p className="text-xs text-gray-500 mt-1">Code: {part.code || "—"}</p>

          <div className="mt-2 text-xs text-gray-600 grid grid-cols-2 gap-1">
            <div>
              <strong>Category:</strong> {part.category || "—"}
            </div>
            <div>
              <strong>Qty:</strong> {part.quantity || 0}
            </div>
            <div>
              <strong>Location:</strong> {part.location || "—"}
            </div>
            <div>
              <strong>Manufacturer:</strong> {part.manufacturer || "—"}
            </div>
          </div>

          {part.specs && (
            <details className="mt-3 text-xs text-gray-600">
              <summary className="cursor-pointer font-medium">
                Specifications
              </summary>
              <p className="mt-2 text-gray-700 whitespace-pre-line">
                {part.specs}
              </p>
            </details>
          )}

          {part.notes && (
            <p className="mt-2 text-xs text-gray-500">
              <strong>Notes:</strong> {part.notes}
            </p>
          )}
        </div>

        <div className="flex flex-col gap-2">
          <button onClick={onEdit} className="p-1 rounded hover:bg-gray-100">
            <Edit2 size={16} />
          </button>
          <button onClick={onDelete} className="p-1 rounded hover:bg-gray-100">
            <Trash2 size={16} />
          </button>
        </div>
      </div>
    </motion.div>
  );
}

/* -------------------------
   Main Page
------------------------- */
export default function SparePartsInventory() {
  const [parts, setParts] = useState({});
  const [query, setQuery] = useState("");
  const [showModal, setShowModal] = useState(false);
  const [editingKey, setEditingKey] = useState(null);
  const [form, setForm] = useState(getEmptyForm());
  const [deleteKey, setDeleteKey] = useState(null);

  /* -------------------------
     Firebase
  ------------------------- */
  useEffect(() => {
    const partsRef = ref(db, "spareParts");
    return onValue(partsRef, (snap) => {
      setParts(snap.val() || {});
    });
  }, []);

  /* -------------------------
     CRUD
  ------------------------- */
  async function savePart(e) {
    e.preventDefault();
    if (!form.name || !form.code) {
      alert("Part name and code are required.");
      return;
    }

    try {
      if (editingKey) {
        await update(ref(db, `spareParts/${editingKey}`), form);
      } else {
        await push(ref(db, "spareParts"), form);
      }
      setShowModal(false);
      setEditingKey(null);
      setForm(getEmptyForm());
    } catch (err) {
      console.error(err);
      alert("Failed to save part.");
    }
  }

  async function removePart(key) {
    try {
      await remove(ref(db, `spareParts/${key}`));
      setDeleteKey(null);
    } catch (err) {
      console.error(err);
      alert("Failed to delete part.");
    }
  }

  /* -------------------------
     Data Prep
  ------------------------- */
  const flat = Object.entries(parts).map(([k, v]) => ({
    key: k,
    ...v,
  }));

  const filtered = flat.filter((p) => {
    const q = query.toLowerCase();
    return (
      p.name?.toLowerCase().includes(q) ||
      p.code?.toLowerCase().includes(q) ||
      p.category?.toLowerCase().includes(q)
    );
  });

  /* -------------------------
     Render
  ------------------------- */
  return (
    <div className="p-4 md:p-6 bg-gray-50 min-h-screen">
      <div className="max-w-7xl mx-auto">
        <h1 className="text-2xl font-bold text-gray-800 mb-4">
          Spare Parts Inventory
        </h1>

        {/* Search */}
        <div className="mb-4 relative">
          <Search className="absolute left-4 top-3 text-gray-400" />
          <input
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Search by part name, code, or category..."
            className="pl-12 pr-4 py-3 border rounded-xl w-full text-sm shadow-sm"
          />
        </div>

        {/* Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filtered.length > 0 ? (
            filtered.map((p) => (
              <SparePartCard
                key={p.key}
                part={p}
                onEdit={() => {
                  setEditingKey(p.key);
                  setForm(p);
                  setShowModal(true);
                }}
                onDelete={() => setDeleteKey(p.key)}
              />
            ))
          ) : (
            <div className="col-span-full text-center text-gray-500 bg-white p-6 rounded-xl border border-dashed">
              No spare parts found.
            </div>
          )}
        </div>

        {/* Floating Add Button */}
        <motion.button
          onClick={() => {
            setEditingKey(null);
            setForm(getEmptyForm());
            setShowModal(true);
          }}
          whileHover={{ scale: 1.08 }}
          className="fixed bottom-6 right-6 bg-green-600 text-white w-14 h-14 rounded-full shadow-2xl flex items-center justify-center z-50"
        >
          <Plus size={22} />
        </motion.button>

        {/* Add/Edit Modal */}
        <AnimatePresence>
          {showModal && (
            <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                className="absolute inset-0 bg-black/40"
                onClick={() => setShowModal(false)}
              />

              <motion.form
                onSubmit={savePart}
                onClick={(e) => e.stopPropagation()}
                className="relative bg-white rounded-2xl shadow-xl w-full max-w-3xl p-6 max-h-[90vh] overflow-y-auto"
              >
                <h2 className="text-lg font-semibold mb-4">
                  {editingKey ? "Edit Spare Part" : "Add Spare Part"}
                </h2>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                  {/* Text inputs */}
                  {[
                    ["name", "Part Name *"],
                    ["code", "Part Code *"],
                  ].map(([key, label]) => (
                    <div key={key}>
                      <label className="text-xs text-gray-600">{label}</label>
                      <input
                        value={form[key]}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, [key]: e.target.value }))
                        }
                        className="border rounded px-3 py-2 w-full"
                      />
                    </div>
                  ))}

                  {/* Category dropdown */}
                  <div>
                    <label className="text-xs text-gray-600">Category</label>
                    <select
                      value={form.category}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, category: e.target.value }))
                      }
                      className="border rounded px-3 py-2 w-full"
                    >
                      <option value="">Select category</option>
                      <option value="Electrical">Electrical</option>
                      <option value="Mechanical">Mechanical</option>
                      <option value="Welding & Fabrication">
                        Welding & Fabrication
                      </option>
                    </select>
                  </div>

                  {[
                    ["quantity", "Quantity"],
                    ["location", "Location"],
                    ["manufacturer", "Manufacturer"],
                    ["unitPrice", "Unit Price"],
                  ].map(([key, label]) => (
                    <div key={key}>
                      <label className="text-xs text-gray-600">{label}</label>
                      <input
                        value={form[key]}
                        onChange={(e) =>
                          setForm((f) => ({ ...f, [key]: e.target.value }))
                        }
                        className="border rounded px-3 py-2 w-full"
                      />
                    </div>
                  ))}

                  {/* Specs */}
                  <div className="md:col-span-2">
                    <label className="text-xs text-gray-600">
                      Specifications
                    </label>
                    {form.category && (
                      <p className="text-xs text-gray-400 mb-1">
                        {CATEGORY_SPEC_HINTS[form.category]}
                      </p>
                    )}
                    <textarea
                      value={form.specs}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, specs: e.target.value }))
                      }
                      className="border rounded px-3 py-2 w-full min-h-[90px]"
                    />
                  </div>

                  {/* Notes */}
                  <div className="md:col-span-2">
                    <label className="text-xs text-gray-600">Notes</label>
                    <textarea
                      value={form.notes}
                      onChange={(e) =>
                        setForm((f) => ({ ...f, notes: e.target.value }))
                      }
                      className="border rounded px-3 py-2 w-full min-h-[80px]"
                    />
                  </div>
                </div>

                <div className="flex justify-end gap-3 mt-4">
                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="px-4 py-2 rounded bg-gray-200"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="px-4 py-2 rounded bg-green-600 text-white"
                  >
                    Save
                  </button>
                </div>
              </motion.form>
            </motion.div>
          )}
        </AnimatePresence>

        {/* Delete Modal unchanged */}
        <AnimatePresence>
          {deleteKey && (
            <motion.div className="fixed inset-0 z-50 flex items-center justify-center p-4">
              <div
                className="absolute inset-0 bg-black/40"
                onClick={() => setDeleteKey(null)}
              />
              <div className="relative bg-white rounded-xl p-6 shadow-xl max-w-md w-full">
                <h3 className="font-semibold mb-3">Delete spare part?</h3>
                <div className="flex justify-end gap-3">
                  <button
                    onClick={() => setDeleteKey(null)}
                    className="px-4 py-2 bg-gray-200 rounded"
                  >
                    Cancel
                  </button>
                  <button
                    onClick={() => removePart(deleteKey)}
                    className="px-4 py-2 bg-red-600 text-white rounded"
                  >
                    Delete
                  </button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
}
