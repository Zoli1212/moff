import React from "react";
import {
  Sidebar,
  SidebarContent,
  SidebarFooter,
  SidebarGroup,
  SidebarGroupContent,
  SidebarHeader,
  SidebarMenu,
} from "@/components/ui/sidebar";
import { Calendar, Inbox, Layers, UserCircle, Wallet } from "lucide-react";
import Image from "next/image";
import { usePathname } from "next/navigation";
import { SignOutButton, UserButton } from "@clerk/nextjs";

const mainItems = [
  {
    title: "Munkaterület",
    url: "/dashboard",
    icon: Layers,
  },
  {
    title: "Áraim",
    url: "/dashboard",
    icon: Layers,
  },
  {
    title: "Ügyfelek",
    url: "/dashboard",
    icon: Layers,
  },
  {
    title: "Ajánlataim",
    url: "/dashboard",
    icon: Layers,
  },
  {
    title: "Asszisztens",
    url: "/dashboard/tools/assistant",
    icon: Inbox,
  },
  {
    title: "Csevegés",
    url: "/ai-tools",
    icon: Inbox,
  },
  {
    title: "Előzményeim",
    url: "/my-history",
    icon: Calendar,
  },
  {
    title: "Számláim",
    url: "/my-billing",
    icon: Calendar,
  },
];

const secondaryItems = [
  {
    title: "Előfizetésem",
    url: "/billing",
    icon: Wallet,
  },
  {
    title: "Profil",
    url: "/profile",
    icon: UserCircle,
  },
];

export function AppSidebar() {
  const path = usePathname();
  return (
    <Sidebar>
      <SidebarHeader>
        <div className="p-4">
          <Image
            src={"/logo.svg"}
            alt="logo"
            width={100}
            height={100}
            className="w-full"
          />
          <h2 className="text-sm text-gray-400 text-center mt-3">
            Fejlessz nagyszerű készségeket!
          </h2>
        </div>
      </SidebarHeader>
      <SidebarContent className="">
        <SidebarGroup>
          <SidebarGroupContent>
            <SidebarMenu className="mt-2">
              {mainItems.map((item, index) => (
                <a
                  href={item.url}
                  key={index}
                  className={`p-2 text-lg flex gap-2 items-center
                                  hover:bg-gray-100 rounded-lg ${
                                    (item.url === "/ai-tools" &&
                                      path.startsWith("/ai-tools")) ||
                                    (item.url === "/my-history" &&
                                      path.startsWith("/my-history")) ||
                                    (item.url === "/my-billing" &&
                                      path.startsWith("/my-billing")) ||
                                    path === item.url
                                      ? "bg-gray-200"
                                      : ""
                                  }`}
                >
                  <item.icon className="h-5 w-5" />
                  <span>{item.title}</span>
                </a>
              ))}
              <div className="my-4 border-t border-gray-200"></div>
              <div className="flex flex-wrap gap-2 justify-center">
                {secondaryItems.map((item, index) => (
                  <a
                    href={item.url}
                    key={"secondary-" + index}
                    className={`min-w-[120px] flex-1 max-w-[180px] p-4 text-lg flex flex-col items-center gap-2 bg-white shadow border hover:bg-gray-100 rounded-lg transition-all duration-150 ${
                      path === item.url ? "bg-gray-200" : ""
                    }`}
                  >
                    <item.icon className="h-7 w-7 mb-1" />
                    <span className="text-center">{item.title}</span>
                  </a>
                ))}
              </div>
            </SidebarMenu>
          </SidebarGroupContent>
        </SidebarGroup>
      </SidebarContent>
      <div className="flex justify-center items-center w-full border-t border-gray-200 pt-4 pb-2 mb-2 bg-white">
        <UserButton afterSignOutUrl="/" />
      </div>
      <SidebarFooter>
        <SignOutButton redirectUrl="/">
          <button className="px-4 py-2 border border-orange-500 text-orange-500 rounded hover:bg-orange-500 hover:text-white transition-colors">
            Kijelentkezés
          </button>
        </SignOutButton>
      </SidebarFooter>
    </Sidebar>
  );
}
