'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { updateWorkforceRegistry, WorkforceRegistryData } from '@/actions/workforce-registry-actions'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface WorkforceEditModalProps {
  isOpen: boolean
  onClose: () => void
  worker: WorkforceRegistryData
  onWorkerUpdated: (worker: WorkforceRegistryData) => void
}

export default function WorkforceEditModal({ isOpen, onClose, worker, onWorkerUpdated }: WorkforceEditModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [formData, setFormData] = useState({
    name: '',
    role: '',
    email: '',
    phone: '',
    contactInfo: '',
    hiredDate: '',
    leftDate: '',
    currentlyAvailable: true,
    isActive: true,
    notes: '',
    avatarUrl: ''
  })

  useEffect(() => {
    if (worker) {
      setFormData({
        name: worker.name || '',
        role: worker.role || '',
        email: worker.email || '',
        phone: worker.phone || '',
        contactInfo: worker.contactInfo || '',
        hiredDate: worker.hiredDate ? new Date(worker.hiredDate).toISOString().split('T')[0] : '',
        leftDate: worker.leftDate ? new Date(worker.leftDate).toISOString().split('T')[0] : '',
        currentlyAvailable: worker.currentlyAvailable,
        isActive: worker.isActive,
        notes: worker.notes || '',
        avatarUrl: worker.avatarUrl || ''
      })
    }
  }, [worker])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    try {
      const dataToSubmit = {
        ...formData,
        hiredDate: formData.hiredDate ? new Date(formData.hiredDate) : undefined,
        leftDate: formData.leftDate ? new Date(formData.leftDate) : undefined,
        email: formData.email || undefined,
        phone: formData.phone || undefined,
        contactInfo: formData.contactInfo || undefined,
        notes: formData.notes || undefined,
        avatarUrl: formData.avatarUrl || undefined
      }

      const result = await updateWorkforceRegistry(worker.id!, dataToSubmit)
      
      if (result.success && result.data) {
        toast.success('Munkás sikeresen frissítve')
        onWorkerUpdated(result.data)
      } else {
        toast.error(result.error || 'Hiba történt a munkás frissítése során')
      }
    } catch (error) {
        console.log((error as Error).message)
      toast.error('Hiba történt a munkás frissítése során')
    } finally {
      setIsLoading(false)
    }
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Munkás szerkesztése</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {/* Name - Required */}
            <div>
              <Label htmlFor="name">Név *</Label>
              <Input
                id="name"
                value={formData.name}
                onChange={(e) => handleInputChange('name', e.target.value)}
                placeholder="Teljes név"
                required
                className="mt-1"
              />
            </div>

            {/* Role - Required */}
            <div>
              <Label htmlFor="role">Szerepkör *</Label>
              <Input
                id="role"
                value={formData.role}
                onChange={(e) => handleInputChange('role', e.target.value)}
                placeholder="pl. festő, burkoló, villanyszerelő"
                required
                className="mt-1"
              />
            </div>

            {/* Email */}
            <div>
              <Label htmlFor="email">Email</Label>
              <Input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => handleInputChange('email', e.target.value)}
                placeholder="email@example.com"
                className="mt-1"
              />
            </div>

            {/* Phone */}
            <div>
              <Label htmlFor="phone">Telefon</Label>
              <Input
                id="phone"
                value={formData.phone}
                onChange={(e) => handleInputChange('phone', e.target.value)}
                placeholder="+36 30 123 4567"
                className="mt-1"
              />
            </div>

            {/* Hired Date */}
            <div>
              <Label htmlFor="hiredDate">Felvétel dátuma</Label>
              <Input
                id="hiredDate"
                type="date"
                value={formData.hiredDate}
                onChange={(e) => handleInputChange('hiredDate', e.target.value)}
                className="mt-1"
              />
            </div>

            {/* Left Date */}
            <div>
              <Label htmlFor="leftDate">Távozás dátuma</Label>
              <Input
                id="leftDate"
                type="date"
                value={formData.leftDate}
                onChange={(e) => handleInputChange('leftDate', e.target.value)}
                className="mt-1"
              />
            </div>
          </div>

          {/* Contact Info */}
          <div>
            <Label htmlFor="contactInfo">További elérhetőség</Label>
            <Input
              id="contactInfo"
              value={formData.contactInfo}
              onChange={(e) => handleInputChange('contactInfo', e.target.value)}
              placeholder="Cím, további telefonszám, stb."
              className="mt-1"
            />
          </div>

          {/* Avatar URL */}
          <div>
            <Label htmlFor="avatarUrl">Profilkép URL</Label>
            <Input
              id="avatarUrl"
              type="url"
              value={formData.avatarUrl}
              onChange={(e) => handleInputChange('avatarUrl', e.target.value)}
              placeholder="https://example.com/avatar.jpg"
              className="mt-1"
            />
          </div>

          {/* Notes */}
          <div>
            <Label htmlFor="notes">Megjegyzések</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => handleInputChange('notes', e.target.value)}
              placeholder="További információk, megjegyzések..."
              rows={3}
              className="mt-1"
            />
          </div>

          {/* Switches */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="flex items-center space-x-2">
              <Switch
                id="isActive"
                checked={formData.isActive}
                onCheckedChange={(checked) => handleInputChange('isActive', checked)}
              />
              <Label htmlFor="isActive" className="text-sm font-medium">
                Aktív munkás
              </Label>
            </div>

            <div className="flex items-center space-x-2">
              <Switch
                id="currentlyAvailable"
                checked={formData.currentlyAvailable}
                onCheckedChange={(checked) => handleInputChange('currentlyAvailable', checked)}
              />
              <Label htmlFor="currentlyAvailable" className="text-sm font-medium">
                Jelenleg elérhető
              </Label>
            </div>
          </div>

          {/* Action Buttons */}
          <div className="flex justify-end space-x-2 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={onClose}
              disabled={isLoading}
            >
              Mégse
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !formData.name.trim() || !formData.role.trim()}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Mentés
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
