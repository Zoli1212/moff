'use client'

import React, { useState } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { deleteWorkforceRegistry, WorkforceRegistryData } from '@/actions/workforce-registry-actions'
import { toast } from 'sonner'
import { Loader2, AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface WorkforceDeleteModalProps {
  isOpen: boolean
  onClose: () => void
  worker: WorkforceRegistryData
  onWorkerDeleted: (workerId: number) => void
}

export default function WorkforceDeleteModal({ isOpen, onClose, worker, onWorkerDeleted }: WorkforceDeleteModalProps) {
  const [isLoading, setIsLoading] = useState(false)

  const handleDelete = async () => {
    setIsLoading(true)

    try {
      const result = await deleteWorkforceRegistry(worker.id!)
      
      if (result.success) {
        toast.success('Munkás sikeresen törölve')
        onWorkerDeleted(worker.id!)
      } else {
        toast.error(result.error || 'Hiba történt a munkás törlése során')
      }
    } catch (error) {
      console.log((error as Error).message)
      toast.error('Hiba történt a munkás törlése során')
    } finally {
      setIsLoading(false)
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            Munkás törlése
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <Alert className="border-red-200 bg-red-50">
            <AlertTriangle className="h-4 w-4 text-red-600" />
            <AlertDescription className="text-red-800">
              Ez a művelet nem visszavonható! A munkás véglegesen törlődik a rendszerből.
            </AlertDescription>
          </Alert>

          <div className="bg-gray-50 p-4 rounded-lg">
            <h4 className="font-semibold text-gray-900 mb-2">Törlendő munkás:</h4>
            <div className="space-y-1 text-sm text-gray-600">
              <p><strong>Név:</strong> {worker.name}</p>
              <p><strong>Szerepkör:</strong> {worker.role}</p>
              {worker.email && <p><strong>Email:</strong> {worker.email}</p>}
              {worker.phone && <p><strong>Telefon:</strong> {worker.phone}</p>}
            </div>
          </div>

          <p className="text-sm text-gray-600">
            Biztosan törölni szeretné <strong>{worker.name}</strong> munkást a rendszerből?
          </p>

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
              type="button"
              variant="destructive"
              onClick={handleDelete}
              disabled={isLoading}
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Törlés
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
