"use client"

import React, { useState } from 'react'
import { useLocale } from "@/components/i18n/LocaleProvider";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ShoppingCart, Calendar, Package } from "lucide-react"
import PlaceholderForm from './PlaceholderForm'

export default function AidClient() {
  const { t } = useLocale();

  const [activeTab, setActiveTab] = useState("beszerzesi")

  return (
    <div className="w-full">
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3">
          <TabsTrigger value="beszerzesi" className="flex items-center gap-2">
            <ShoppingCart className="w-4 h-4" />
            {t("x.procurementAssistant")}
          </TabsTrigger>
          <TabsTrigger value="munkaterv" className="flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            {t("x.workPlanAssistant")}
          </TabsTrigger>
          <TabsTrigger value="raktarkeszlet" className="flex items-center gap-2">
            <Package className="w-4 h-4" />
            Raktárkeszlét
          </TabsTrigger>
        </TabsList>

        <TabsContent value="beszerzesi" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <ShoppingCart className="w-5 h-5" />
                {t("x.procurementAssistant")}
              </CardTitle>
              <CardDescription>
                Anyagok es eszkozok beszerzesnek tervezese es nyomon kovetese
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PlaceholderForm title={t("x.procurementAssistant")} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="munkaterv" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Calendar className="w-5 h-5" />
                {t("x.workPlanAssistant")}
              </CardTitle>
              <CardDescription>
                Munkak utemezese es tervezese segedeszkozokkel
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PlaceholderForm title={t("x.workPlanAssistant")} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="raktarkeszlet" className="mt-6">
          <Card>
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <Package className="w-5 h-5" />
                {t("x.stock")}
              </CardTitle>
              <CardDescription>
                Raktaron levo anyagok es eszkozok nyilvantartasa
              </CardDescription>
            </CardHeader>
            <CardContent>
              <PlaceholderForm title={t("x.stock")} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  )
}
