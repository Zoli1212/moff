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
  }, [
    user?.emailAddresses?.[0]?.emailAddress,
    shouldRefetch,
    setUserData,
    clearUserData,
  ]);

  return (
    <Sidebar className="bg-gradient-to-b from-gray-900 to-gray-800 text-gray-100 border-r border-gray-700">
      <SidebarHeader className="bg-gradient-to-b from-gray-900 to-gray-800 border-b border-gray-700">
        <div className="p-3 flex flex-col items-center">
          <Image
            src={"/logo.svg"}
            alt="logo"
            width={100}
            height={100}
            className="mb-2"
          />
        </div>
      </SidebarHeader>

      <SidebarContent className="bg-gradient-to-b from-gray-900 to-gray-800 flex flex-col">
        <SidebarGroup className="flex-1">
          <SidebarGroupContent className="bg-transparent">
            <SidebarMenu className="mt-2 space-y-2">
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
                      style={{
                        backgroundColor: isActive ? "#DE6B12" : "transparent",
                        color: isActive ? "white" : "#D1D5DB",
                        boxShadow: isActive
                          ? "0 10px 15px -3px rgba(222, 107, 18, 0.3)"
                          : "none",
                      }}
                      onMouseEnter={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = "#374151";
                          e.currentTarget.style.color = "#DE6B12";
                        }
                      }}
                      onMouseLeave={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = "transparent";
                          e.currentTarget.style.color = "#D1D5DB";
                        }
                      }}
                      onTouchStart={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = "#374151";
                          e.currentTarget.style.color = "#DE6B12";
                        }
                      }}
                      onTouchEnd={(e) => {
                        if (!isActive) {
                          e.currentTarget.style.backgroundColor = "transparent";
                          e.currentTarget.style.color = "#D1D5DB";
                        }
                      }}
                      className={`flex items-center gap-3 px-3 py-3 rounded-lg text-sm font-medium transition-all cursor-pointer active:bg-[#374151] active:text-[#DE6B12]`}
                    >
                      <item.icon className="w-5 h-5 flex-shrink-0" />
                      <span className="truncate">{item.title}</span>
                    </a>
                  );
                })}
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>

        {/* Secondary items pushed to bottom */}
        <div className="mt-auto border-t border-gray-700 pt-3 pb-3">
          <div className="flex flex-col gap-2 px-2">
            {secondaryItems.map((item, index) => {
              const isActive = path === item.url;
              return (
                <a
                  key={"secondary-" + index}
                  href={item.url}
                  style={{
                    backgroundColor: isActive
                      ? "#DE6B12"
                      : "rgba(55, 65, 81, 0.5)",
                    color: isActive ? "white" : "#D1D5DB",
                    borderColor: "#4B5563",
                    boxShadow: isActive
                      ? "0 10px 15px -3px rgba(222, 107, 18, 0.3)"
                      : "none",
                  }}
                  onMouseEnter={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = "#4B5563";
                      e.currentTarget.style.color = "#DE6B12";
                    }
                  }}
                  onMouseLeave={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor =
                        "rgba(55, 65, 81, 0.5)";
                      e.currentTarget.style.color = "#D1D5DB";
                    }
                  }}
                  onTouchStart={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor = "#4B5563";
                      e.currentTarget.style.color = "#DE6B12";
                    }
                  }}
                  onTouchEnd={(e) => {
                    if (!isActive) {
                      e.currentTarget.style.backgroundColor =
                        "rgba(55, 65, 81, 0.5)";
                      e.currentTarget.style.color = "#D1D5DB";
                    }
                  }}
                  className={`flex items-center gap-3 px-3 py-2 rounded-lg text-sm font-medium transition-all border cursor-pointer active:bg-[#4B5563] active:text-[#DE6B12]`}
                >
                  <item.icon className="h-5 w-5 flex-shrink-0" />
                  <span className="truncate">{item.title}</span>
                </a>
              );
            })}
          </div>
        </div>
      </SidebarContent>

      <div className="flex flex-col items-center w-full border-t border-gray-700 pt-3 pb-3 bg-gradient-to-b from-gray-900 to-gray-800">
        <TenantSelectorSidebar />

        <UserButton afterSignOutUrl="/" />

        {showThemeSelector && (
          <div className="mt-3 w-full px-3">
            <div className="bg-gray-800 border border-gray-600 rounded-lg p-3 shadow-xl">
              <div className="flex justify-between items-center mb-2">
                <h2 className="text-xs font-semibold text-orange-400">
                  Háttér választása
                </h2>
                <button
                  onClick={() => setShowThemeSelector(false)}
                  className="text-gray-500 hover:text-orange-400 transition-colors"
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
                    style={{
                      backgroundColor:
                        currentTheme === theme ? "#DE6B12" : "#374151",
                      color: currentTheme === theme ? "white" : "#D1D5DB",
                      boxShadow:
                        currentTheme === theme
                          ? "0 10px 15px -3px rgba(222, 107, 18, 0.3)"
                          : "none",
                    }}
                    onMouseEnter={(e) => {
                      if (currentTheme !== theme) {
                        e.currentTarget.style.backgroundColor = "#4B5563";
                        e.currentTarget.style.color = "#DE6B12";
                      }
                    }}
                    onMouseLeave={(e) => {
                      if (currentTheme !== theme) {
                        e.currentTarget.style.backgroundColor = "#374151";
                        e.currentTarget.style.color = "#D1D5DB";
                      }
                    }}
                    onTouchStart={(e) => {
                      if (currentTheme !== theme) {
                        e.currentTarget.style.backgroundColor = "#4B5563";
                        e.currentTarget.style.color = "#DE6B12";
                      }
                    }}
                    onTouchEnd={(e) => {
                      if (currentTheme !== theme) {
                        e.currentTarget.style.backgroundColor = "#374151";
                        e.currentTarget.style.color = "#D1D5DB";
                      }
                    }}
                    className={`p-2 rounded-md text-xs font-medium transition-all cursor-pointer active:bg-[#4B5563] active:text-[#DE6B12]`}
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
          style={{
            backgroundColor: "#374151",
            color: "#DE6B12",
            borderColor: "#4B5563",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.backgroundColor = "#4B5563";
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.backgroundColor = "#374151";
          }}
          onTouchStart={(e) => {
            e.currentTarget.style.backgroundColor = "#4B5563";
          }}
          onTouchEnd={(e) => {
            e.currentTarget.style.backgroundColor = "#374151";
          }}
          className="w-11/12 mt-2 py-2 px-3 rounded-lg text-xs font-medium flex items-center justify-center gap-2 transition-colors border cursor-pointer active:bg-[#4B5563]"
        >
          <Palette size={14} />
          <span>Háttér</span>
        </button>
      </div>

      <SidebarFooter className="bg-gradient-to-b from-gray-900 to-gray-800 border-t border-gray-700">
        <div className="w-full px-3 pb-2">
          <SignOutButton redirectUrl="/">
            <button
              style={{
                borderColor: "#DE6B12",
                color: "#DE6B12",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.backgroundColor = "#DE6B12";
                e.currentTarget.style.color = "white";
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "#DE6B12";
              }}
              onTouchStart={(e) => {
                e.currentTarget.style.backgroundColor = "#DE6B12";
                e.currentTarget.style.color = "white";
              }}
              onTouchEnd={(e) => {
                e.currentTarget.style.backgroundColor = "transparent";
                e.currentTarget.style.color = "#DE6B12";
              }}
              className="w-full px-3 py-2 border rounded-lg text-xs font-medium transition-colors cursor-pointer active:bg-[#DE6B12] active:text-white"
            >
              Kijelentkezés
            </button>
          </SignOutButton>
        </div>
      </SidebarFooter>
    </Sidebar>
  );
}
