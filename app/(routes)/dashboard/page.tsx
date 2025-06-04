import React from "react";


import { UserCircle, Tag, FileText } from "lucide-react";
import Link from "next/link";

function Dashboard() {
  const tiles = [
    {
      title: "Ügyfelek",
      href: "/dashboard/clients",
      icon: <UserCircle className="w-10 h-10 mb-2" />,
    },
    {
      title: "Áraim",
      href: "/dashboard/prices",
      icon: <Tag className="w-10 h-10 mb-2" />,
    },
    {
      title: "Ajánlataim",
      href: "/dashboard/offers",
      icon: <FileText className="w-10 h-10 mb-2" />,
    },
  ];
  return (
    <div className="min-h-[60vh] flex items-center justify-center">
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6 w-full max-w-4xl px-4">
        {tiles.map((tile) => (
          <Link
            href={tile.href}
            key={tile.title}
            className="group bg-green-100 hover:bg-green-200 transition-colors duration-200 rounded-2xl shadow-lg p-8 flex flex-col items-center justify-center text-center border border-green-200 cursor-pointer"
          >
            <span className="text-green-600">{tile.icon}</span>
            <span className="font-bold text-xl text-green-900 mb-1 group-hover:underline">
              {tile.title}
            </span>
          </Link>
        ))}
      </div>
    </div>
  );
}

export default Dashboard;
