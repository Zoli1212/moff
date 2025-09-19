'use client'

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Textarea } from '@/components/ui/textarea'
import { Switch } from '@/components/ui/switch'
import { createWorkforceRegistry, WorkforceRegistryData } from '@/actions/workforce-registry-actions'
import { toast } from 'sonner'
import { Loader2 } from 'lucide-react'

interface WorkforceAddModalProps {
  isOpen: boolean
  onClose: () => void
  onWorkerAdded: (worker: WorkforceRegistryData) => void
}

export default function WorkforceAddModal({ isOpen, onClose, onWorkerAdded }: WorkforceAddModalProps) {
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

      const result = await createWorkforceRegistry(dataToSubmit)
      
      if (result.success) {
        toast.success('Munkás sikeresen hozzáadva')
        onWorkerAdded(result.data)
        handleClose()
      } else {
        toast.error(result.error || 'Hiba történt a munkás hozzáadása során')
      }
    } catch (error) {
      toast.error('Hiba történt a munkás hozzáadása során')
    } finally {
      setIsLoading(false)
    }
  }

  const handleClose = () => {
    setFormData({
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
    onClose()
  }

  const handleInputChange = (field: string, value: string | boolean) => {
    setFormData(prev => ({
      ...prev,
      [field]: value
    }))
  }

  return (
    <Dialog open={isOpen} onOpenChange={handleClose}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Új munkás hozzáadása</DialogTitle>
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
              onClick={handleClose}
              disabled={isLoading}
            >
              Mégse
            </Button>
            <Button
              type="submit"
              disabled={isLoading || !formData.name.trim() || !formData.role.trim()}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Hozzáadás
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
