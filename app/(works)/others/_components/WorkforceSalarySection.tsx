'use client'

import React, { useState, useEffect } from 'react'
import { Button } from '@/components/ui/button'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Edit, History, TrendingUp } from 'lucide-react'
import { WorkforceRegistryData } from '@/actions/workforce-registry-actions'
import { getSalaryHistory } from '@/utils/salary-helper'
import SalaryEditModal from './SalaryEditModal'
import SalaryHistoryModal from './SalaryHistoryModal'

interface WorkforceSalaryProps {
  worker: WorkforceRegistryData
  onSalaryUpdated?: () => void
}

interface SalaryHistoryItem {
  id: number
  dailyRate: number
  validFrom: Date
  createdAt: Date
}

export default function WorkforceSalarySection({ worker, onSalaryUpdated }: WorkforceSalaryProps) {
  const [showEditModal, setShowEditModal] = useState(false)
  const [showHistoryModal, setShowHistoryModal] = useState(false)
  const [salaryHistory, setSalaryHistory] = useState<SalaryHistoryItem[]>([])
  const [isLoading, setIsLoading] = useState(false)

  const loadSalaryHistory = async () => {
    if (!worker.id) return
    
    setIsLoading(true)
    try {
      const history = await getSalaryHistory(worker.id)
      setSalaryHistory(history)
    } catch (error) {
      console.error('Error loading salary history:', error)
    } finally {
      setIsLoading(false)
    }
  }

  useEffect(() => {
    loadSalaryHistory()
  }, [worker.id])

  const handleSalaryUpdated = () => {
    loadSalaryHistory()
    onSalaryUpdated?.()
  }

  const formatCurrency = (amount: number | null) => {
    if (!amount) return '0 Ft'
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency: 'HUF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getCurrentSalary = () => {
    if (salaryHistory.length > 0) {
      // A legfrissebb fizetés (első elem, mert desc rendezés)
      return salaryHistory[0].dailyRate
    }
    return worker.dailyRate || 0
  }

  const hasMultipleSalaries = salaryHistory.length > 1

  return (
    <>
      <Card className="mb-4">
        <CardHeader className="pb-3">
          <CardTitle className="text-lg flex items-center gap-2">
            <TrendingUp className="h-5 w-5 text-green-600" />
            Fizetés
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {/* Jelenlegi fizetés */}
            <div className="flex items-center justify-between">
              <div className="space-y-1">
                <p className="text-sm text-gray-600">Jelenlegi napi díj</p>
                <p className="text-2xl font-bold text-gray-900">
                  {formatCurrency(getCurrentSalary())}
                </p>
                <p className="text-xs text-gray-500">
                  Órabér: {formatCurrency(getCurrentSalary() / 8)} / óra
                </p>
              </div>
              <div className="flex gap-2">
                <Button
                  type="button"
                  variant="outline"
                  size="sm"
                  onClick={() => setShowEditModal(true)}
                  className="flex items-center gap-1"
                >
                  <Edit className="h-4 w-4" />
                  Szerkesztés
                </Button>
                {hasMultipleSalaries && (
                  <Button
                    type="button"
                    variant="outline"
                    size="sm"
                    onClick={() => setShowHistoryModal(true)}
                    className="flex items-center gap-1"
                  >
                    <History className="h-4 w-4" />
                    Történet
                  </Button>
                )}
              </div>
            </div>

            {/* Fizetéstörténet összefoglaló */}
            {hasMultipleSalaries && (
              <div className="bg-gray-50 p-3 rounded-lg">
                <p className="text-sm text-gray-600 mb-2">Fizetéstörténet</p>
                <div className="space-y-1">
                  {salaryHistory.slice(0, 3).map((item, index) => (
                    <div key={item.id} className="flex justify-between text-xs">
                      <span className={index === 0 ? 'font-medium text-green-600' : 'text-gray-500'}>
                        {new Date(item.validFrom).toLocaleDateString('hu-HU')} -től
                      </span>
                      <span className={index === 0 ? 'font-medium text-green-600' : 'text-gray-500'}>
                        {formatCurrency(item.dailyRate)}
                      </span>
                    </div>
                  ))}
                  {salaryHistory.length > 3 && (
                    <p className="text-xs text-gray-400 mt-1">
                      +{salaryHistory.length - 3} további bejegyzés
                    </p>
                  )}
                </div>
              </div>
            )}

          </div>
        </CardContent>
      </Card>

      {/* Modálok */}
      <SalaryEditModal
        isOpen={showEditModal}
        onClose={() => setShowEditModal(false)}
        worker={worker}
        currentSalary={getCurrentSalary()}
        onSalaryUpdated={handleSalaryUpdated}
      />

      <SalaryHistoryModal
        isOpen={showHistoryModal}
        onClose={() => setShowHistoryModal(false)}
        worker={worker}
        salaryHistory={salaryHistory}
        isLoading={isLoading}
      />
    </>
  )
}
