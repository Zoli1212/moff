'use client'

import React, { useState } from 'react'
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card'
import { Badge } from '@/components/ui/badge'
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar'
import { Switch } from '@/components/ui/switch'
import { Label } from '@/components/ui/label'
import { Input } from '@/components/ui/input'
import { Button } from '@/components/ui/button'
import { 
  Search, 
  Users, 
  Phone, 
  Mail, 
  Briefcase, 
  Plus, 
  Edit, 
  Trash2, 
  Calendar,
  CheckCircle,
  XCircle
} from 'lucide-react'
import { WorkforceRegistryData, toggleWorkforceRegistryActive, toggleWorkforceRegistryRestricted } from '@/actions/workforce-registry-actions'
import { toast } from 'sonner'
import WorkforceAddModal from './WorkforceAddModal'
import WorkforceEditModal from './WorkforceEditModal'
import WorkforceDeleteModal from './WorkforceDeleteModal'


interface WorkforceRegistryClientProps {
  workforceRegistry: WorkforceRegistryData[]
}

export default function WorkforceRegistryClient({ workforceRegistry: initialData }: WorkforceRegistryClientProps) {
  const [workforceRegistry, setWorkforceRegistry] = useState<WorkforceRegistryData[]>(initialData)
  const [searchTerm, setSearchTerm] = useState('')
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all')
  
  // Modal states
  const [showAddModal, setShowAddModal] = useState(false)
  const [showEditModal, setShowEditModal] = useState(false)
  const [showDeleteModal, setShowDeleteModal] = useState(false)
  const [selectedWorker, setSelectedWorker] = useState<WorkforceRegistryData | null>(null)

  // Filter workers based on search and filters
  const filteredWorkers = workforceRegistry.filter(worker => {
    const matchesSearch = 
      worker.name?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      worker.email?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      worker.role?.toLowerCase().includes(searchTerm.toLowerCase()) ||
      worker.phone?.toLowerCase().includes(searchTerm.toLowerCase())
    
    const matchesStatus = 
      statusFilter === 'all' || 
      (statusFilter === 'active' && worker.isActive) ||
      (statusFilter === 'inactive' && !worker.isActive)
    
    return matchesSearch && matchesStatus
  })

  const handleToggleActive = async (workerId: number) => {
    try {
      const result = await toggleWorkforceRegistryActive(workerId)
      if (result.success) {
        setWorkforceRegistry(prev => 
          prev.map(worker => 
            worker.id === workerId 
              ? { ...worker, isActive: !worker.isActive }
              : worker
          )
        )
        toast.success('Aktív státusz sikeresen módosítva')
      } else {
        toast.error(result.error || 'Hiba történt')
      }
    } catch {
      toast.error('Hiba történt a státusz módosítása során')
    }
  }

  const handleToggleRestricted = async (workerId: number) => {
    try {
      const result = await toggleWorkforceRegistryRestricted(workerId)
      if (result.success) {
        setWorkforceRegistry(prev => 
          prev.map(worker => 
            worker.id === workerId 
              ? { ...worker, isRestricted: !worker.isRestricted }
              : worker
          )
        )
        toast.success('Korlátozás státusz sikeresen módosítva')
      } else {
        toast.error(result.error || 'Hiba történt')
      }
    } catch {
      toast.error('Hiba történt a korlátozás módosítása során')
    }
  }


  const handleEdit = (worker: WorkforceRegistryData) => {
    setSelectedWorker(worker)
    setShowEditModal(true)
  }

  const handleDelete = (worker: WorkforceRegistryData) => {
    setSelectedWorker(worker)
    setShowDeleteModal(true)
  }

  const handleWorkerAdded = (newWorker: WorkforceRegistryData) => {
    setWorkforceRegistry(prev => [...prev, newWorker])
    setShowAddModal(false)
  }

  const handleWorkerUpdated = (updatedWorker: WorkforceRegistryData) => {
    setWorkforceRegistry(prev => 
      prev.map(worker => 
        worker.id === updatedWorker.id ? updatedWorker : worker
      )
    )
    setShowEditModal(false)
    setSelectedWorker(null)
  }

  const handleWorkerDeleted = (deletedWorkerId: number) => {
    setWorkforceRegistry(prev => 
      prev.filter(worker => worker.id !== deletedWorkerId)
    )
    setShowDeleteModal(false)
    setSelectedWorker(null)
  }

  const getInitials = (name: string) => {
    return name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  }

  const formatDate = (date: Date | string | null) => {
    if (!date) return null
    const d = new Date(date)
    return d.toLocaleDateString('hu-HU')
  }

  const activeCount = workforceRegistry.filter(w => w.isActive).length
  const totalCount = workforceRegistry.length

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
              <CheckCircle className="h-8 w-8 text-green-600" />
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
              <XCircle className="h-8 w-8 text-red-600" />
              <div>
                <p className="text-2xl font-bold text-red-600">{totalCount - activeCount}</p>
                <p className="text-sm text-gray-600">Inaktív munkások</p>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Filters and Add Button */}
      <Card>
        <CardHeader>
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between space-y-3 sm:space-y-0">
            <CardTitle className="flex items-center gap-2">
              <Search className="h-5 w-5" />
              Szűrők és Keresés
            </CardTitle>
            <Button onClick={() => setShowAddModal(true)} className="flex items-center gap-2 w-full sm:w-auto bg-[#FE9C00] hover:bg-[#E68A00] text-white">
              <Plus className="h-4 w-4" />
              Új munkás hozzáadása
            </Button>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="search">Keresés</Label>
              <Input
                id="search"
                placeholder="Név, email, szerepkör, telefon..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="mt-1"
              />
            </div>
            <div>
              <Label htmlFor="status">Aktív státusz</Label>
              <select
                id="status"
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
                className="mt-1 w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="all">Minden státusz</option>
                <option value="active">Csak aktív</option>
                <option value="inactive">Csak inaktív</option>
              </select>
            </div>
            <div className="flex items-end">
              <Button 
                variant="outline" 
                onClick={() => {
                  setSearchTerm('')
                  setStatusFilter('all')
                }}
                className="w-full"
              >
                Szűrők törlése
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Workers List */}
      <div className="space-y-4">
        {filteredWorkers.map((worker) => (
          <Card
            key={worker.id}
            className={`transition-all duration-200 hover:shadow-md ${
              !worker.isActive ? 'opacity-75 bg-gray-50' : 'bg-white'
            }`}
          >
            <CardContent className="p-4 md:p-6">
              <div className="flex flex-col md:flex-row md:items-center md:justify-between space-y-4 md:space-y-0">
                <div className="flex flex-col sm:flex-row sm:items-center space-y-3 sm:space-y-0 sm:space-x-4">
                  <Avatar className="h-12 w-12 sm:h-16 sm:w-16 mx-auto sm:mx-0">
                    <AvatarImage src={worker.avatarUrl || undefined} />
                    <AvatarFallback className="bg-gradient-to-br from-blue-500 to-purple-600 text-white font-semibold text-sm sm:text-lg">
                      {getInitials(worker.name)}
                    </AvatarFallback>
                  </Avatar>
                  
                  <div className="space-y-2 text-center sm:text-left">
                    <div className="flex flex-col sm:flex-row sm:items-center gap-2 sm:gap-3">
                      <h3 className="font-semibold text-lg sm:text-xl text-gray-900">
                        {worker.name}
                      </h3>
                      <div className="flex flex-wrap justify-center sm:justify-start gap-2">
                        <Badge variant="outline" className="text-xs">
                          <Briefcase className="h-3 w-3 mr-1" />
                          {worker.role}
                        </Badge>
                        <Badge 
                          variant={worker.isActive ? "default" : "secondary"}
                          className={worker.isActive ? "bg-green-600" : "bg-gray-500"}
                        >
                          {worker.isActive ? 'Aktív' : 'Inaktív'}
                        </Badge>
                      </div>
                    </div>
                    
                    <div className="flex flex-col sm:flex-row sm:flex-wrap gap-2 sm:gap-4 text-sm text-gray-600">
                      {worker.email && (
                        <div className="flex items-center justify-center sm:justify-start gap-1">
                          <Mail className="h-4 w-4 flex-shrink-0" />
                          <span className="truncate">{worker.email}</span>
                        </div>
                      )}
                      {worker.phone && (
                        <div className="flex items-center justify-center sm:justify-start gap-1">
                          <Phone className="h-4 w-4 flex-shrink-0" />
                          <span>{worker.phone}</span>
                        </div>
                      )}
                      {worker.hiredDate && (
                        <div className="flex items-center justify-center sm:justify-start gap-1">
                          <Calendar className="h-4 w-4 flex-shrink-0" />
                          <span>Felvéve: {formatDate(worker.hiredDate)}</span>
                        </div>
                      )}
                      {worker.leftDate && (
                        <div className="flex items-center justify-center sm:justify-start gap-1">
                          <Calendar className="h-4 w-4 flex-shrink-0" />
                          <span>Távozott: {formatDate(worker.leftDate)}</span>
                        </div>
                      )}
                    </div>
                    
                    {worker.notes && (
                      <div className="text-sm text-gray-500 text-center sm:text-left">
                        <strong>Megjegyzések:</strong> <span className="break-words">{worker.notes}</span>
                      </div>
                    )}
                  </div>
                </div>
                
                <div className="flex flex-col sm:flex-row sm:items-center justify-center space-y-4 sm:space-y-0 sm:space-x-4 pt-4 md:pt-0 border-t md:border-t-0 w-full">
                  {/* Toggle Switches */}
                  <div className="flex items-center justify-center space-x-2 w-full">
                    <Label htmlFor={`active-${worker.id}`} className="text-sm font-medium">
                      Aktív
                    </Label>
                    <Switch
                      id={`active-${worker.id}`}
                      checked={worker.isActive}
                      onCheckedChange={() => handleToggleActive(worker.id!)}
                      className={`${worker.isActive ? 'data-[state=checked]:bg-green-600' : ''}`}
                    />
                  </div>

                  <div className="flex items-center justify-center space-x-2 w-full">
                    <Label htmlFor={`restricted-${worker.id}`} className="text-sm font-medium">
                      Napló korlátozása
                    </Label>
                    <Switch
                      id={`restricted-${worker.id}`}
                      checked={worker.isRestricted}
                      onCheckedChange={() => handleToggleRestricted(worker.id!)}
                      className={`${worker.isRestricted ? 'data-[state=checked]:bg-red-600' : ''}`}
                    />
                  </div>
                  
                  {/* Action Buttons */}
                  <div className="flex flex-row sm:flex-col justify-center sm:justify-start space-x-2 sm:space-x-0 sm:space-y-2">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleEdit(worker)}
                      className="flex items-center gap-1 flex-1 sm:flex-none"
                      style={{ color: '#FE9C00' }}
                    >
                      <Edit className="h-4 w-4" />
                      <span className="hidden xs:inline">Szerkesztés</span>
                    </Button>
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => handleDelete(worker)}
                      className="flex items-center gap-1 hover:text-red-700 hover:bg-red-50 flex-1 sm:flex-none"
                      style={{ color: '#FE9C00' }}
                    >
                      <Trash2 className="h-4 w-4" />
                      <span className="hidden xs:inline">Törlés</span>
                    </Button>
                  </div>
                </div>
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
              Próbálja meg módosítani a keresési feltételeket vagy adjon hozzá új munkást.
            </p>
          </CardContent>
        </Card>
      )}

      {/* Modals */}
      <WorkforceAddModal
        isOpen={showAddModal}
        onClose={() => setShowAddModal(false)}
        onWorkerAdded={handleWorkerAdded}
      />
      
      {selectedWorker && (
        <>
          <WorkforceEditModal
            isOpen={showEditModal}
            onClose={() => {
              setShowEditModal(false)
              setSelectedWorker(null)
            }}
            worker={selectedWorker}
            onWorkerUpdated={handleWorkerUpdated}
          />
          
          <WorkforceDeleteModal
            isOpen={showDeleteModal}
            onClose={() => {
              setShowDeleteModal(false)
              setSelectedWorker(null)
            }}
            worker={selectedWorker}
            onWorkerDeleted={handleWorkerDeleted}
          />
        </>
      )}
    </div>
  )
}
