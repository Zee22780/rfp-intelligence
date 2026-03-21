import React from "react";
import { Menu, LogOut } from "lucide-react";
import { useRouter } from "next/navigation";
import { NavigationItem } from "../types/types";

interface HeaderProps {
  activeNav: NavigationItem;
  setSidebarOpen: (open: boolean) => void;
  sidebarOpen: boolean;
}

const Header: React.FC<HeaderProps> = ({
  activeNav,
  setSidebarOpen,
  sidebarOpen,
}) => {
  const router = useRouter();

  function handleLogout() {
    document.cookie = "auth-token=; path=/; expires=Thu, 01 Jan 1970 00:00:00 GMT";
    router.push("/login");
  }

  return (
    <header className="h-16 flex items-center justify-between px-6 bg-white/50 backdrop-blur-md sticky top-0 z-30">
      <div className="flex items-center gap-4">
        <button
          onClick={() => setSidebarOpen(true)}
          className={`p-2 hover:bg-gray-100 rounded-lg text-gray-600 ${sidebarOpen ? "lg:hidden" : ""}`}
        >
          <Menu size={20} />
        </button>
        {activeNav !== NavigationItem.Chat && (
          <h2 className="text-lg font-semibold text-gray-900 hidden sm:block">
            {activeNav}
          </h2>
        )}
      </div>

      <div className="flex items-center gap-3 md:gap-6 flex-1 max-w-2xl justify-end">
        <button
          onClick={handleLogout}
          className="p-2 hover:bg-gray-100 rounded-lg text-gray-500 hover:text-gray-700"
          title="Sign out"
        >
          <LogOut size={18} />
        </button>
      </div>
    </header>
  );
};

export default Header;
