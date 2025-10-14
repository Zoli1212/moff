"use client"

import React from 'react'

import { Construction } from "lucide-react"

interface PlaceholderFormProps {
  title: string
}

export default function PlaceholderForm({ title }: PlaceholderFormProps) {
  return (
    <div className="flex flex-col items-center justify-center py-12 px-6">
      <div className="text-center">
        <Construction className="w-16 h-16 text-gray-400 mx-auto mb-4" />
        <h3 className="text-xl font-semibold text-gray-700 mb-2">
          {title}
        </h3>
        <p className="text-gray-500 text-lg">
          Hamarosan elérhető lesz
        </p>
        <div className="mt-6 p-4 bg-gray-50 rounded-lg border-2 border-dashed border-gray-300">
          <p className="text-sm text-gray-600">
            Ez a funkció jelenleg fejlesztés alatt áll. Kérjük, látogasson vissza később!
          </p>
        </div>
      </div>
    </div>
  )
}
