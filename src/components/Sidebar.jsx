import { NavLink } from "react-router-dom";
import {
  MdDashboard,
  MdBuild,
  MdStorage,
  MdSchedule,
  MdChevronRight,
  MdChevronLeft,
} from "react-icons/md";
import { useState, useEffect } from "react";

function Sidebar() {
  const [tooltipVisible, setTooltipVisible] = useState(null);
  const [collapsed, setCollapsed] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 800);

  // Update screen size
  useEffect(() => {
    const handleResize = () => setIsMobile(window.innerWidth < 800);
    window.addEventListener("resize", handleResize);
    return () => window.removeEventListener("resize", handleResize);
  }, []);

  // Auto-collapse on mobile when screen shrinks
  useEffect(() => {
    if (isMobile) {
      setCollapsed(true);
    } else {
      setCollapsed(false); // always expanded on desktop
    }
  }, [isMobile]);

  const toggleSidebar = () => setCollapsed(!collapsed);

  const menu = [
    { label: "Work Orders", path: "/workorders", icon: <MdBuild size={20} /> },
    {
      label: "Machine Inventory",
      path: "/machineinventory",
      icon: <MdStorage size={20} />,
    },
    {
      label: "Maintenance Schedule",
      path: "/workschedule",
      icon: <MdSchedule size={20} />,
    },
  ];

  const handleMouseEnter = (index) => collapsed && setTooltipVisible(index);
  const handleMouseLeave = () => setTooltipVisible(null);
  const handleClick = (index) => {
    if (collapsed) {
      setTooltipVisible(index);
      setTimeout(() => setTooltipVisible(null), 1500); // tooltip stays briefly on click
    }
  };

  return (
    <div
      className={`
        bg-gray-900 text-white flex flex-col transition-all duration-300
        fixed left-0 z-40 top-16 h-[calc(100vh-64px)]
        ${collapsed ? "w-24" : "w-64"}
      `}
    >
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-4 border-b border-gray-700">
        <div
          className={`flex items-center gap-2 transition-all duration-300 
          `}
        >
          <MdDashboard size={24} />
          <h1
            className={`text-xl font- ${
              collapsed ? "opacity-0 w-0" : "opacity-100 w-auto"
            }`}
          >
            Admin Dashboard
          </h1>
        </div>

        {/* Collapse/Expand button only on medium/small screens */}
        {isMobile && (
          <button
            onClick={toggleSidebar}
            className="
      flex items-center z-50 justify-center
      p-1.5 rounded
   hover:bg-gray-800
      cursor-pointer
      transition-all duration-200
      active:scale-95
    "
            aria-label={collapsed ? "Expand sidebar" : "Collapse sidebar"}
          >
            {collapsed ? (
              <MdChevronRight size={24} />
            ) : (
              <MdChevronLeft size={24} />
            )}
          </button>
        )}
      </div>

      {/* Menu */}
      <nav className="flex flex-col gap-8 px-3 py-4">
        {menu.map((item, index) => (
          <div
            key={item.path}
            className="relative flex items-center"
            onMouseEnter={() => handleMouseEnter(index)}
            onMouseLeave={handleMouseLeave}
          >
            <NavLink
              to={item.path}
              className={({ isActive }) =>
                `flex items-center gap-3 px-3 py-2 rounded-md transition-all cursor-pointer w-full
                 ${isActive ? "bg-gray-700" : "hover:bg-gray-800"}`
              }
              onClick={() => handleClick(index)}
            >
              {item.icon}
              {!collapsed && (
                <span className="transition-all duration-300 whitespace-nowrap">
                  {item.label}
                </span>
              )}
            </NavLink>

            {/* Tooltip */}
            {collapsed && tooltipVisible === index && (
              <div
                className="absolute left-1/2 bottom-0 translate-x-[-50%] translate-y-full px-2 py-1 bg-gray-800 text-white text-sm rounded shadow-lg z-50 pointer-events-none whitespace-normal text-center max-w-[140px]
    "
              >
                {item.label}
              </div>
            )}
          </div>
        ))}
      </nav>
    </div>
  );
}

export default Sidebar;
