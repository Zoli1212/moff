// Új stílusos AppSidebar arany-sötétszürke témában

import React, { useEffect, useState } from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
} from "@/components/ui/sidebar";
import {
  Inbox,
  Layers,
  Palette,
  X,
  UserCircle,
  Wallet,
  Users,
} from "lucide-react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { SignOutButton, UserButton, useUser } from "@clerk/nextjs";
import { useThemeStore } from "@/store/theme-store";
import { TenantSelectorSidebar } from "@/components/TenantSelectorSidebar";
import { getCurrentUserData } from "@/actions/user-actions";
import { useUserStore } from "@/store/userStore";

const mainItems = [
  { title: "Munkáim", url: "/works", icon: Layers },
  { title: "Ajánlataim", url: "/offers", icon: Inbox, tenantOnly: true },
  { title: "Számláim", url: "/billings", icon: Wallet, tenantOnly: true },
  { title: "Munkások", url: "/others", icon: Users, tenantOnly: true },
];

const secondaryItems = [
  { title: "Előfizetésem", url: "/billing", icon: Wallet },
  { title: "Profil", url: "/profile", icon: UserCircle },
];

export function AppSidebar() {
  const path = usePathname();
  const { user } = useUser();
  const { theme: currentTheme, setTheme } = useThemeStore();
  const [showThemeSelector, setShowThemeSelector] = useState(false);
  const { isTenant, shouldRefetch, setUserData, clearUserData } =
    useUserStore();

  useEffect(() => {
    if (user?.id) {
      useThemeStore.getState().syncThemeWithDb(user.id);
    }
  }, [user]);

  useEffect(() => {
    const userEmail = user?.emailAddresses?.[0]?.emailAddress;

    // KRITIKUS: Ha nincs bejelentkezve, AZONNAL töröljük a cache-t
    if (!userEmail) {
      clearUserData();
      return;
    }

    // Csak akkor frissítünk, ha megváltozott a felhasználó vagy nincs cache
    if (!shouldRefetch(userEmail)) return;

    // Háttérben frissítjük az adatokat (nem blokkolja a UI-t)
    getCurrentUserData()
      .then((data) => {
        if (userEmail) {
          setUserData(data.isTenant ?? true, userEmail);
        }
      })
      .catch(() => {
        if (userEmail) {
          setUserData(true, userEmail);
        }
      });
  }, [user?.emailAddresses?.[0]?.emailAddress, shouldRefetch, setUserData, clearUserData]);

  return (
    <Sidebar className="bg-white text-[#FF7700] border-r border-[#333]">
      <SidebarHeader className="bg-white">
        <div className="p-4 flex flex-col items-center">
          <Image
            src={"/logo.svg"}
            alt="logo"
            width={120}
            height={120}
            className="mb-2"
          />
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-white flex flex-col">
        <SidebarGroup className="flex-1">
          <SidebarGroupContent className="bg-white">
            <SidebarMenu className="mt-2 space-y-1">
              {mainItems
                .filter((item) => {
                  // Hide tenant-only items for non-tenant users (workers)
                  if (!isTenant && item.tenantOnly) {
                    return false;
                  }
                  return true;
                })
                .map((item, index) => {
                  const isActive =
                    path === item.url || path.startsWith(item.url + "/");

                  return (
                    <a
                      key={index}
                      href={item.url}
                      className={`flex items-center gap-3 p-2 rounded-lg text-md transition-colors text-[#FF7700]
                        ${
                          isActive
                            ? "bg-gradient-to-r from-orange-500 via-orange-400 to-orange-300 text-black font-semibold"
                            : "hover:bg-gray-100 hover:text-orange-400"
                        }`}
                    >
                      <item.icon className="w-5 h-5" />
                      <span>{item.title}</span>
                    </a>
                  );
                })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Secondary items pushed to bottom */}
        <div className="mt-auto border-t border-[#FF9900] pt-4 pb-4">
          <div className="flex flex-wrap gap-2 justify-center px-2">
            {secondaryItems.map((item, index) => {
              const isActive = path === item.url;
              return (
                <a
                  key={"secondary-" + index}
                  href={item.url}
                  className={`min-w-[120px] flex-1 max-w-[180px] p-4 flex flex-col items-center text-center rounded-xl transition-all border-2
        ${
          isActive
            ? "bg-orange-600 text-black border-orange-600 font-semibold shadow-md"
            : "bg-gray-100 text-[#FF7700] border-orange-500 hover:bg-gray-200 hover:shadow"
        }`}
                >
                  <item.icon className="h-6 w-6 mb-1" />
                  <span>{item.title}</span>
                </a>
              );
            })}
          </div>
        </div>
      </SidebarContent>

      <div className="flex flex-col items-center w-full border-t border-[#FF7700] pt-4 pb-3 bg-white">
        <TenantSelectorSidebar />

        <UserButton afterSignOutUrl="/" />

        {showThemeSelector && (
          <div className="mt-4 w-full px-4">
            <div className="bg-gray-50 border border-[#FF7700] rounded-xl p-3 shadow-lg">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-sm font-semibold text-[#FF7700]">
                  Válassz hátteret
                </h2>
                <button
                  onClick={() => setShowThemeSelector(false)}
                  className="text-[#999] hover:text-orange-400"
                >
                  <X size={16} />
                </button>
              </div>
              <div className="grid grid-cols-3 gap-2">
                {(["landing", "corporate", "common"] as const).map((theme) => (
                  <button
                    key={theme}
                    onClick={() => {
                      setTheme(theme);
                      setShowThemeSelector(false);
                    }}
                    className={`p-2 rounded-md text-sm transition-all
                      ${
                        currentTheme === theme
                          ? "bg-orange-600 text-black font-semibold"
                          : "bg-gray-200 text-[#FF7700] hover:bg-gray-300"
                      }`}
                  >
                    {theme.charAt(0).toUpperCase() + theme.slice(1)}
                  </button>
                ))}
              </div>
            </div>
          </div>
        )}

        <button
          onClick={() => setShowThemeSelector(!showThemeSelector)}
          className="w-11/12 mt-3 bg-gray-100 hover:bg-gray-200 text-[#FF7700] py-2 px-3 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-colors"
        >
          <Palette size={16} />
          <span>Háttér beállítása</span>
        </button>
      </div>

      <SidebarFooter className="bg-white">
        <div className="w-full px-4 pb-4">
          <SignOutButton redirectUrl="/">
            <button className="w-full px-4 py-2 border border-orange-600 text-orange-600 rounded hover:bg-orange-600 hover:text-black transition-colors text-sm">
              Kijelentkezés
            </button>
          </SignOutButton>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
