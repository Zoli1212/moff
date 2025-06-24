"use client";
import Image from "next/image";
import {
  UserCircle,
  Tag,
  FileText,
  Wrench,
  DollarSign,
  Mail,
} from "lucide-react";
import Link from "next/link";
import React from "react";

export default function Dashboard() {
  const tiles = [
    {
      title: "Ajánlataim",
      href: "/dashboard/offers",
      icon: <FileText className="w-10 h-10 text-orange-500" />,
    },
    {
      title: "Munkáim",
      href: "/dashboard/jobs",
      icon: <Wrench className="w-10 h-10 text-orange-500" />,
    },
    {
      title: "Számláim",
      href: "/dashboard/billings",
      icon: <DollarSign className="w-10 h-10 text-orange-500" />,
    },
    {
      title: "Aktuális Áraim",
      href: "/dashboard/prices",
      icon: <Tag className="w-10 h-10 text-orange-500" />,
    },
    {
      title: "Ügyfeleim",
      href: "/dashboard/tools/assistant",
      icon: <UserCircle className="w-10 h-10 text-orange-500" />,
    },
    {
      title: "Email elemző",
      href: "/dashboard/email",
      icon: <Mail className="w-10 h-10 text-orange-500" />,
    },
  ];

  return (
    <div className="relative h-full w-full">
      {/* Background Image */}
      <div className="fixed inset-0 -z-10">
        <Image
          src="/landing.jpg"
          alt="Woman with notebook at construction site"
          fill
          priority
          className="object-cover"
          style={{
            objectPosition: "center bottom",
          }}
          sizes="100vw"
        />
        <div className="absolute inset-0 bg-black/20"></div>
      </div>

      {/* Tiles Grid */}
      <div className="min-h-screen flex items-center justify-center p-6">
        <div className="grid grid-cols-2 gap-12 justify-items-center w-full max-w-2xl">
          {tiles.map((tile) => (
            <div key={tile.title} className="w-36">
              <Link
                href={tile.href}
                className="group flex items-center justify-center"
              >
                <div className="w-28 h-28 rounded-full border-2 border-orange-500 flex items-center justify-center shadow-lg transform hover:scale-110 transition-all duration-200 bg-transparent hover:bg-white/20">
                  {React.cloneElement(tile.icon, { size: 40 })}
                </div>
              </Link>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
