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
  Calendar,
  Inbox,
  Layers,
  Palette,
  X,
  UserCircle,
  Wallet,
} from "lucide-react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { SignOutButton, UserButton, useUser } from "@clerk/nextjs";
import { useThemeStore } from "@/store/theme-store";

const mainItems = [
  { title: "Munkaterület", url: "/dashboard", icon: Layers },
  { title: "Áraim", url: "/dashboard", icon: Layers },
  { title: "Ügyfelek", url: "/dashboard", icon: Layers },
  { title: "Ajánlataim", url: "/dashboard", icon: Layers },
  { title: "Asszisztens", url: "/dashboard/tools/assistant", icon: Inbox },
  { title: "Csevegés", url: "/ai-tools", icon: Inbox },
  { title: "Előzményeim", url: "/my-history", icon: Calendar },
  { title: "Számláim", url: "/my-billing", icon: Calendar },
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

  useEffect(() => {
    if (user?.id) {
      useThemeStore.getState().syncThemeWithDb(user.id);
    }
  }, [user]);

  return (
    <Sidebar className="bg-[#1f1f1f] text-[#f5deb3] border-r border-[#333]">
      <SidebarHeader>
        <div className="p-4 flex flex-col items-center">
          <Image
            src={"/logo.svg"}
            alt="logo"
            width={80}
            height={80}
            className="mb-2"
          />
          <h2 className="text-sm text-[#aaaaaa] text-center">
            Fejlessz nagyszerű készségeket!
          </h2>
        </div>
      </SidebarHeader>

      <SidebarContent>
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="mt-2 space-y-1">
              {mainItems.map((item, index) => {
                const isActive =
                  path === item.url ||
                  (item.url === "/ai-tools" && path.startsWith("/ai-tools")) ||
                  (item.url === "/my-history" &&
                    path.startsWith("/my-history")) ||
                  (item.url === "/my-billing" &&
                    path.startsWith("/my-billing"));

                return (
                  <a
                    key={index}
                    href={item.url}
                    className={`flex items-center gap-3 p-2 rounded-lg text-md transition-colors
                      ${
                        isActive
                          ? "bg-gradient-to-r from-yellow-500 via-yellow-400 to-yellow-300 text-black font-semibold"
                          : "hover:bg-[#333] hover:text-yellow-300"
                      }`}
                  >
                    <item.icon className="w-5 h-5" />
                    <span>{item.title}</span>
                  </a>
                );
              })}

              <div className="my-4 border-t border-[#444]"></div>

              <div className="flex flex-wrap gap-2 justify-center">
                {secondaryItems.map((item, index) => {
                  const isActive = path === item.url;
                  return (
                    <a
                      key={"secondary-" + index}
                      href={item.url}
                      className={`min-w-[120px] flex-1 max-w-[180px] p-4 flex flex-col items-center text-center rounded-xl transition-all border-2
          ${
            isActive
              ? "bg-yellow-500 text-black border-yellow-500 font-semibold shadow-md"
              : "bg-[#2a2a2a] text-[#f5deb3] border-yellow-400 hover:bg-[#3a3a3a] hover:shadow"
          }`}
                    >
                      <item.icon className="h-6 w-6 mb-1" />
                      <span>{item.title}</span>
                    </a>
                  );
                })}
              </div>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>

      <div className="flex flex-col items-center w-full border-t border-[#444] pt-4 pb-3 bg-[#1a1a1a]">
        <UserButton afterSignOutUrl="/" />

        {showThemeSelector && (
          <div className="mt-4 w-full px-4">
            <div className="bg-[#2c2c2c] border border-[#444] rounded-xl p-3 shadow-lg">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-sm font-semibold text-[#f5deb3]">
                  Válassz hátteret
                </h2>
                <button
                  onClick={() => setShowThemeSelector(false)}
                  className="text-[#999] hover:text-yellow-400"
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
                          ? "bg-yellow-500 text-black font-semibold"
                          : "bg-[#444] text-[#f5deb3] hover:bg-[#555]"
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
          className="w-11/12 mt-3 bg-[#2e2e2e] hover:bg-[#3a3a3a] text-[#f5deb3] py-2 px-3 rounded-md text-sm font-medium flex items-center justify-center gap-2 transition-colors"
        >
          <Palette size={16} />
          <span>Háttér beállítása</span>
        </button>
      </div>

      <SidebarFooter>
        <div className="w-full px-4 pb-4">
          <SignOutButton redirectUrl="/">
            <button className="w-full px-4 py-2 border border-yellow-500 text-yellow-500 rounded hover:bg-yellow-500 hover:text-black transition-colors text-sm">
              Kijelentkezés
            </button>
          </SignOutButton>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
