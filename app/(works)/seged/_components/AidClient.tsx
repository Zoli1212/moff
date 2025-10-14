"use client"

import React, { useState } from 'react'
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ShoppingCart, Calendar, Package } from "lucide-react"
import PlaceholderForm from './PlaceholderForm'

export default function AidClient() {
  const [activeTab, setActiveTab] = useState("beszerzesi")

  return (
    <div className="w-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="beszerzesi" className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" />
            Beszerzesi seged
          </TabsTrigger>
          <TabsTrigger value="munkaterv" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Munkaterv seged
          </TabsTrigger>
          <TabsTrigger value="raktarkeszlet" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Raktarkeszlet
          </TabsTrigger>
        </TabsList>

        <TabsContent value="beszerzesi" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                Beszerzesi seged
              </CardTitle>
              <CardDescription>
                Anyagok es eszkozok beszerzesnek tervezese es nyomon kovetese
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PlaceholderForm title="Beszerzesi seged" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="munkaterv" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                Munkaterv seged
              </CardTitle>
              <CardDescription>
                Munkak utemezese es tervezese segedeszkozokkel
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PlaceholderForm title="Munkaterv seged" />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="raktarkeszlet" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                Raktarkeszlet
              </CardTitle>
              <CardDescription>
                Raktaron levo anyagok es eszkozok nyilvantartasa
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PlaceholderForm title="Raktarkeszlet" />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
