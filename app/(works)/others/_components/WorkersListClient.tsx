'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { WorkerAcrossTenants } from '@/actions/get-all-workers-across-tenants'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Search, Users, Building2, Phone, Mail, Briefcase } from 'lucide-react'

interface WorkersListClientProps {
  workers: WorkerAcrossTenants[]
}

interface WorkerWithStatus extends WorkerAcrossTenants {
  isActive: boolean
}

export default function WorkersListClient({ workers }: WorkersListClientProps) {
  // Initialize workers with fake active status
  const [workersWithStatus, setWorkersWithStatus] = useState<WorkerWithStatus[]>(
    workers.map(worker => ({
      ...worker,
      isActive: Math.random() > 0.3 // Random initial status for demo
    }))
  )
  
  const [searchTerm, setSearchTerm] = useState('')
  const [selectedTenant, setSelectedTenant] = useState<string>('all')

  // Get unique tenants
  const tenants = Array.from(new Set(workers.map(w => w.tenantEmail)))

  // Filter workers based on search and tenant
  const filteredWorkers = workersWithStatus.filter(worker => {
    const matchesSearch = 
      worker.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      worker.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      worker.role?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesTenant = selectedTenant === 'all' || worker.tenantEmail === selectedTenant
    
    return matchesSearch && matchesTenant
  })

  // Group workers by tenant
  const workersByTenant = filteredWorkers.reduce((acc, worker) => {
    if (!acc[worker.tenantEmail]) {
      acc[worker.tenantEmail] = []
    }
    acc[worker.tenantEmail].push(worker)
    return acc
  }, {} as Record<string, WorkerWithStatus[]>)

  const handleToggleWorker = (workerId: number) => {
    setWorkersWithStatus(prev => 
      prev.map(worker => 
        worker.id === workerId 
          ? { ...worker, isActive: !worker.isActive }
          : worker
      )
    )
  }

  const getInitials = (name: string | null) => {
    if (!name) return '?'
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const activeCount = workersWithStatus.filter(w => w.isActive).length
  const totalCount = workersWithStatus.length

  return (
    <div className="space-y-6">
      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-8 w-8 text-blue-600" />
              <div>
                <p className="text-2xl font-bold">{totalCount}</p>
                <p className="text-sm text-gray-600">Összes munkás</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Users className="h-8 w-8 text-green-600" />
              <div>
                <p className="text-2xl font-bold text-green-600">{activeCount}</p>
                <p className="text-sm text-gray-600">Aktív munkások</p>
              </div>
            </div>
          </CardContent>
        </Card>
        
        <Card>
          <CardContent className="p-6">
            <div className="flex items-center space-x-2">
              <Building2 className="h-8 w-8 text-purple-600" />
              <div>
                <p className="text-2xl font-bold">{tenants.length}</p>
                <p className="text-sm text-gray-600">Tenant</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <Search className="h-5 w-5" />
            Szűrők
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="search">Keresés</Label>
              <Input
                id="search"
                placeholder="Név, email vagy szerepkör..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="tenant">Tenant</Label>
              <select
                id="tenant"
                value={selectedTenant}
                onChange={(e) => setSelectedTenant(e.target.value)}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Minden tenant</option>
                {tenants.map(tenant => (
                  <option key={tenant} value={tenant}>{tenant}</option>
                ))}
              </select>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workers List */}
      <div className="space-y-6">
        {Object.entries(workersByTenant).map(([tenantEmail, tenantWorkers]) => (
          <Card key={tenantEmail} className="overflow-hidden">
            <CardHeader className="bg-gradient-to-r from-blue-50 to-purple-50 border-b">
              <CardTitle className="flex items-center gap-2">
                <Building2 className="h-5 w-5 text-blue-600" />
                {tenantEmail}
                <Badge variant="secondary" className="ml-auto">
                  {tenantWorkers.length} munkás
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent className="p-0">
              <div className="divide-y divide-gray-100">
                {tenantWorkers.map((worker) => (
                  <div
                    key={worker.id}
                    className={`p-6 transition-all duration-200 hover:bg-gray-50 ${
                      worker.isActive ? 'bg-white' : 'bg-gray-50 opacity-75'
                    }`}
                  >
                    <div className="flex items-center justify-between">
                      <div className="flex items-center space-x-4">
                        <Avatar className="h-12 w-12">
                          <AvatarImage src={worker.avatarUrl || undefined} />
                          <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold">
                            {getInitials(worker.name)}
                          </AvatarFallback>
                        </Avatar>
                        
                        <div className="space-y-1">
                          <div className="flex items-center gap-2">
                            <h3 className="font-semibold text-lg text-gray-900">
                              {worker.name || 'Névtelen munkás'}
                            </h3>
                            {worker.role && (
                              <Badge variant="outline" className="text-xs">
                                <Briefcase className="h-3 w-3 mr-1" />
                                {worker.role}
                              </Badge>
                            )}
                          </div>
                          
                          <div className="flex flex-wrap gap-4 text-sm text-gray-600">
                            {worker.email && (
                              <div className="flex items-center gap-1">
                                <Mail className="h-4 w-4" />
                                {worker.email}
                              </div>
                            )}
                            {worker.phone && (
                              <div className="flex items-center gap-1">
                                <Phone className="h-4 w-4" />
                                {worker.phone}
                              </div>
                            )}
                          </div>
                          
                          {(worker.workTitle || worker.workItemName) && (
                            <div className="text-sm text-gray-500">
                              {worker.workTitle && (
                                <span className="font-medium">Munka: {worker.workTitle}</span>
                              )}
                              {worker.workTitle && worker.workItemName && ' • '}
                              {worker.workItemName && (
                                <span>Fázis: {worker.workItemName}</span>
                              )}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center space-x-4">
                        <div className="text-right">
                          <div className="text-sm font-medium text-gray-900">
                            Mennyiség: {worker.quantity}
                          </div>
                          <div className={`text-sm font-semibold ${
                            worker.isActive ? 'text-green-600' : 'text-red-600'
                          }`}>
                            {worker.isActive ? 'Aktív' : 'Inaktív'}
                          </div>
                        </div>
                        
                        <div className="flex items-center space-x-2">
                          <Label htmlFor={`toggle-${worker.id}`} className="text-sm font-medium">
                            {worker.isActive ? 'Aktív' : 'Inaktív'}
                          </Label>
                          <Switch
                            id={`toggle-${worker.id}`}
                            checked={worker.isActive}
                            onCheckedChange={() => handleToggleWorker(worker.id)}
                            className={worker.isActive ? 'data-[state=checked]:bg-green-600' : ''}
                          />
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredWorkers.length === 0 && (
        <Card>
          <CardContent className="p-12 text-center">
            <Users className="h-12 w-12 text-gray-400 mx-auto mb-4" />
            <h3 className="text-lg font-semibold text-gray-900 mb-2">
              Nincs találat
            </h3>
            <p className="text-gray-600">
              Próbálja meg módosítani a keresési feltételeket.
            </p>
          </CardContent>
        </Card>
      )}
    </div>
  )
}
