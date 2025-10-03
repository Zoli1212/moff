'use client'

import React from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Badge } from '@/components/ui/badge'
import { History, TrendingUp, TrendingDown, Minus, X } from 'lucide-react'
import { format } from 'date-fns'
import { hu } from 'date-fns/locale'
import { WorkforceRegistryData } from '@/actions/workforce-registry-actions'

interface SalaryHistoryItem {
  id: number
  dailyRate: number
  validFrom: Date
  createdAt: Date
}

interface SalaryHistoryModalProps {
  isOpen: boolean
  onClose: () => void
  worker: WorkforceRegistryData
  salaryHistory: SalaryHistoryItem[]
  isLoading: boolean
}

export default function SalaryHistoryModal({
  isOpen,
  onClose,
  worker,
  salaryHistory,
  isLoading
}: SalaryHistoryModalProps) {
  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('hu-HU', {
      style: 'currency',
      currency: 'HUF',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount)
  }

  const getChangeIcon = (currentRate: number, previousRate: number | null) => {
    if (!previousRate) return <Minus className="h-4 w-4 text-gray-400" />
    
    if (currentRate > previousRate) {
      return <TrendingUp className="h-4 w-4 text-green-600" />
    } else if (currentRate < previousRate) {
      return <TrendingDown className="h-4 w-4 text-red-600" />
    } else {
      return <Minus className="h-4 w-4 text-gray-400" />
    }
  }

  const getChangeText = (currentRate: number, previousRate: number | null) => {
    if (!previousRate) return 'Első bejegyzés'
    
    const difference = currentRate - previousRate
    const percentage = ((difference / previousRate) * 100).toFixed(1)
    
    if (difference > 0) {
      return `+${formatCurrency(difference)} (+${percentage}%)`
    } else if (difference < 0) {
      return `${formatCurrency(difference)} (${percentage}%)`
    } else {
      return 'Változatlan'
    }
  }

  const getChangeColor = (currentRate: number, previousRate: number | null) => {
    if (!previousRate) return 'text-gray-600'
    
    if (currentRate > previousRate) {
      return 'text-green-600'
    } else if (currentRate < previousRate) {
      return 'text-red-600'
    } else {
      return 'text-gray-600'
    }
  }

  const getCurrentSalary = () => {
    if (salaryHistory.length > 0) {
      return salaryHistory[0].dailyRate
    }
    return worker.dailyRate || 0
  }

  const getTotalIncrease = () => {
    if (salaryHistory.length < 2) return null
    
    const firstSalary = salaryHistory[salaryHistory.length - 1].dailyRate
    const currentSalary = salaryHistory[0].dailyRate
    const difference = currentSalary - firstSalary
    const percentage = ((difference / firstSalary) * 100).toFixed(1)
    
    return { difference, percentage }
  }

  const totalIncrease = getTotalIncrease()

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="sm:max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <History className="h-5 w-5" />
            Fizetéstörténet - {worker.name}
          </DialogTitle>
        </DialogHeader>

        <div className="space-y-6 py-4">
          {/* Összefoglaló */}
          <div className="bg-gray-50 p-4 rounded-lg">
            <div className="grid grid-cols-2 gap-4">
              <div>
                <p className="text-sm text-gray-600 mb-1">Jelenlegi fizetés</p>
                <p className="text-xl font-semibold text-gray-900">
                  {formatCurrency(getCurrentSalary())}
                </p>
                <p className="text-xs text-gray-500">
                  Órabér: {formatCurrency(getCurrentSalary() / 8)} / óra
                </p>
              </div>
              {totalIncrease && (
                <div>
                  <p className="text-sm text-gray-600 mb-1">Összes növekedés</p>
                  <p className={`text-xl font-semibold ${
                    totalIncrease.difference >= 0 ? 'text-green-600' : 'text-red-600'
                  }`}>
                    {totalIncrease.difference >= 0 ? '+' : ''}{formatCurrency(totalIncrease.difference)}
                  </p>
                  <p className="text-xs text-gray-500">
                    {totalIncrease.percentage}% változás
                  </p>
                </div>
              )}
            </div>
          </div>

          {/* Fizetéstörténet lista */}
          <div className="space-y-4">
            <h3 className="font-medium text-gray-900">Fizetésváltozások</h3>
            
            {isLoading ? (
              <div className="text-center py-8">
                <p className="text-gray-500">Betöltés...</p>
              </div>
            ) : salaryHistory.length === 0 ? (
              <div className="text-center py-8">
                <History className="h-12 w-12 text-gray-300 mx-auto mb-4" />
                <p className="text-gray-500">Még nincs fizetéstörténet</p>
                <p className="text-sm text-gray-400 mt-1">
                  A jelenlegi fizetés a WorkforceRegistry alapértelmezett értéke.
                </p>
              </div>
            ) : (
              <div className="space-y-3">
                {salaryHistory.map((item, index) => {
                  const previousItem = salaryHistory[index + 1]
                  
                  // Meghatározzuk, hogy ez a jelenlegi fizetés-e
                  const today = new Date()
                  const validSalaries = salaryHistory.filter(salary => {
                    const validFromDate = new Date(salary.validFrom)
                    return validFromDate <= today
                  })
                  
                  let currentSalaryItem = null
                  if (validSalaries.length > 0) {
                    currentSalaryItem = validSalaries.reduce((latest, current) => {
                      const latestDate = new Date(latest.validFrom)
                      const currentDate = new Date(current.validFrom)
                      return currentDate > latestDate ? current : latest
                    })
                  }
                  
                  const isCurrentSalary = currentSalaryItem && item.id === currentSalaryItem.id
                  
                  return (
                    <div
                      key={item.id}
                      className={`border rounded-lg p-4 ${
                        isCurrentSalary ? 'border-green-200 bg-green-50' : 'border-gray-200'
                      }`}
                    >
                      <div className="flex items-center justify-between">
                        <div className="flex items-center gap-3">
                          {getChangeIcon(item.dailyRate, previousItem?.dailyRate || null)}
                          <div>
                            <div className="flex items-center gap-2">
                              <p className="font-medium text-gray-900">
                                {formatCurrency(item.dailyRate)}
                              </p>
                              {isCurrentSalary && (
                                <Badge variant="secondary" className="text-xs">
                                  Jelenlegi
                                </Badge>
                              )}
                            </div>
                            <p className="text-sm text-gray-600">
                              {format(new Date(item.validFrom), "yyyy. MMMM dd.", { locale: hu })} -től érvényes
                            </p>
                          </div>
                        </div>
                        
                        <div className="text-right">
                          <p className={`text-sm font-medium ${
                            getChangeColor(item.dailyRate, previousItem?.dailyRate || null)
                          }`}>
                            {getChangeText(item.dailyRate, previousItem?.dailyRate || null)}
                          </p>
                          <p className="text-xs text-gray-500">
                            Rögzítve: {format(new Date(item.createdAt), "MM. dd.", { locale: hu })}
                          </p>
                        </div>
                      </div>
                      
                      {/* Részletes információk */}
                      <div className="mt-3 pt-3 border-t border-gray-100 grid grid-cols-3 gap-4 text-sm text-gray-600">
                        <div>
                          <p className="text-xs text-gray-500">Órabér</p>
                          <p>{formatCurrency(item.dailyRate / 8)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Heti becslés (5 nap)</p>
                          <p>{formatCurrency(item.dailyRate * 5)}</p>
                        </div>
                        <div>
                          <p className="text-xs text-gray-500">Havi becslés (22 nap)</p>
                          <p>{formatCurrency(item.dailyRate * 22)}</p>
                        </div>
                      </div>
                    </div>
                  )
                })}
              </div>
            )}
          </div>
        </div>

        {/* Bezárás gomb */}
        <div className="flex justify-end pt-4 border-t">
          <Button variant="outline" onClick={onClose}>
            <X className="h-4 w-4 mr-2" />
            Bezárás
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  )
}
