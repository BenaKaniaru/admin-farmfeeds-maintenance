import { useState } from "react";
import { MdAccountCircle, MdLogout, MdMenu } from "react-icons/md";

function Topbar({ toggleSidebar }) {
  const [open, setOpen] = useState(false);

  const handleLogout = () => {
    console.log("Logged out");
  };

  return (
    <div className="w-full bg-white shadow-sm px-6 h-16 flex items-center justify-between fixed top-0 left-0 z-30">
      {/* LEFT SIDE: Hamburger on mobile + Logo */}
      <div className="flex flex-col items-center ">
        {/* FARM FEEDS LOGO */}
        <h1 className="text-2xl font-black text-red-600">FARM FEEDS</h1>
        <h2 className="text-xl font-black text-blue-600">MAINTENANCE</h2>
      </div>

      {/* RIGHT SIDE: Profile */}
      <div className="flex items-center gap-4 relative">
        <button
          className="flex items-center gap-2 px-3 py-1 rounded-md hover:bg-gray-100 transition"
          onClick={() => setOpen(!open)}
        >
          <MdAccountCircle size={28} className="text-gray-700" />
          <span className="text-gray-700 font-medium hidden sm:block">
            Admin User
          </span>
        </button>

        {/* Dropdown */}
        {open && (
          <div className="absolute right-0 top-16 bg-white shadow-lg rounded-md w-40 py-2 z-50">
            <button
              onClick={handleLogout}
              className="w-full flex items-center gap-2 px-4 py-2 text-gray-700 hover:bg-gray-100"
            >
              <MdLogout size={18} /> Logout
            </button>
          </div>
        )}
      </div>
    </div>
  );
}

export default Topbar;
