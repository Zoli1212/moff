'use client'

import React, { useState, useEffect } from 'react'
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog'
import { Button } from '@/components/ui/button'
import { deleteWorkforceRegistry, cleanupAndDeleteWorkforceRegistry, removeWorkItemWorkerAssignment, removeWorkerDiaryEntries, removeWorkerFromRegistryOnly, WorkforceRegistryData } from '@/actions/workforce-registry-actions'
import { toast } from 'sonner'
import { Loader2, AlertTriangle } from 'lucide-react'
import { Alert, AlertDescription } from '@/components/ui/alert'

interface WorkItemAssignment {
  id: number
  workItemName?: string
  workName?: string
}

interface CleanupData {
  success: false
  error: string
  needsCleanup: true
  workItemAssignments?: WorkItemAssignment[]
  diaryEntriesCount: number
}


interface WorkforceDeleteModalProps {
  isOpen: boolean
  onClose: () => void
  worker: WorkforceRegistryData
  onWorkerDeleted: (workerId: number) => void
}

export default function WorkforceDeleteModal({ isOpen, onClose, worker, onWorkerDeleted }: WorkforceDeleteModalProps) {
  const [isLoading, setIsLoading] = useState(false)
  const [cleanupData, setCleanupData] = useState<CleanupData | null>(null)
  const [checkingConnections, setCheckingConnections] = useState(false)
  
  // Check if registry deletion is allowed (no remaining connections)
  const canDeleteFromRegistry = cleanupData && 
    (!cleanupData.workItemAssignments || cleanupData.workItemAssignments.length === 0) &&
    (!cleanupData.diaryEntriesCount || cleanupData.diaryEntriesCount === 0)

  // Check connections when modal opens
  useEffect(() => {
    if (isOpen && worker?.id && !checkingConnections) {
      setCheckingConnections(true)
      setCleanupData(null) // Reset cleanup data
      checkWorkerConnections()
    }
  }, [isOpen, worker?.id])

  const checkWorkerConnections = async () => {
    try {
      const result = await deleteWorkforceRegistry(worker.id!)
      
      if ('needsCleanup' in result && result.needsCleanup) {
        // Has connections - show cleanup interface
        setCleanupData(result as CleanupData)
      }
      // If no connections, cleanupData stays null - show simple modal
    } catch (error) {
      console.error('Error checking connections:', error)
    } finally {
      setCheckingConnections(false)
    }
  }

  const handleDelete = async () => {
    if (!worker || !worker.id) {
      toast.error('Munkás adatok hiányoznak!')
      return
    }
    
    setIsLoading(true)

    try {
      // Direct delete - this should only be called when no connections exist
      const result = await removeWorkerFromRegistryOnly(worker.id!)
      
      if (result.success) {
        toast.success('Munkás sikeresen deaktiválva')
        onWorkerDeleted(worker.id!)
        onClose()
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

  const handleCleanupAndDelete = async () => {
    setIsLoading(true)

    try {
      const result = await cleanupAndDeleteWorkforceRegistry(worker.id!)
      
      if (result.success) {
        toast.success('Munkás és kapcsolatai sikeresen törölve')
        onWorkerDeleted(worker.id!)
        onClose()
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

  const handleRemoveAllAssignments = async () => {
    try {
      // Remove all workItemWorker assignments for this workforce registry
      if (cleanupData?.workItemAssignments && cleanupData.workItemAssignments.length > 0) {
        for (const assignment of cleanupData.workItemAssignments) {
          await removeWorkItemWorkerAssignment(assignment.id)
        }
        toast.success('Összes munkafázis hozzárendelés eltávolítva')
        
        // Refresh cleanup data
        const refreshResult = await deleteWorkforceRegistry(worker.id!)
        if ('needsCleanup' in refreshResult && refreshResult.needsCleanup) {
          setCleanupData(refreshResult as CleanupData)
        } else {
          setCleanupData(null)
        }
      }
    } catch (error) {

      console.log(error)
      toast.error('Hiba történt a hozzárendelések törlése során')
    }
  }

  const handleRemoveDiaryEntries = async () => {
    try {
      const result = await removeWorkerDiaryEntries(worker.id!)
      if (result.success) {
        toast.success('Napló bejegyzések törölve')
        // Refresh cleanup data
        const refreshResult = await deleteWorkforceRegistry(worker.id!)
        if ('needsCleanup' in refreshResult && refreshResult.needsCleanup) {
          setCleanupData(refreshResult as CleanupData)
        } else {
          setCleanupData(null)
        }
      } else {
        toast.error(result.error || 'Hiba történt')
      }
    } catch (error) {
      console.log(error)
      toast.error('Hiba történt a napló bejegyzések törlése során')
    }
  }

  const handleRemoveFromRegistry = async () => {
    try {
      const result = await removeWorkerFromRegistryOnly(worker.id!)
      if (result.success) {
        toast.success('Munkás sikeresen deaktiválva a regiszterben')
        onWorkerDeleted(worker.id!)
        onClose()
      } else {
        toast.error(result.error || 'Hiba történt')
      }
    } catch (error) {
      console.log(error)
      toast.error('Hiba történt a munkás deaktiválása során')
    }
  }

  return (
    <Dialog open={isOpen} onOpenChange={onClose}>
      <DialogContent className={cleanupData ? "max-w-2xl max-h-[90vh] overflow-y-auto" : "max-w-md"}>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2 text-red-600">
            <AlertTriangle className="h-5 w-5" />
            {cleanupData ? `${worker.name} munkás törlése` : 'Munkás törlése'}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {checkingConnections ? (
            <div className="flex items-center justify-center py-8">
              <Loader2 className="h-6 w-6 animate-spin mr-2" />
              <span>Kapcsolatok ellenőrzése...</span>
            </div>
          ) : cleanupData ? (
            // Cleanup mode - show detailed deletion interface
            <div className="space-y-6">
              <Alert className="border-orange-200 bg-orange-50">
                <AlertTriangle className="h-4 w-4 text-orange-600" />
                <AlertDescription className="text-orange-800">
                  A munkás aktív kapcsolatokkal rendelkezik. Válassza ki, mit szeretne törölni:
                </AlertDescription>
              </Alert>

              {/* Work Item Assignments */}
              {(cleanupData?.workItemAssignments?.length ?? 0) > 0 && (
                <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                  <h4 className="font-semibold text-blue-900 mb-3 flex items-center gap-2">
                    <span className="bg-blue-100 text-blue-800 px-2 py-1 rounded text-sm">
                      {cleanupData.workItemAssignments?.length ?? 0}
                    </span>
                    Munkafázis hozzárendelés
                  </h4>
                  <div className="flex justify-between items-center bg-white p-2 rounded border">
                    <span className="text-sm">Munkafázis hozzárendelések törlése</span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-blue-600 border-blue-300 hover:bg-blue-50"
                      onClick={handleRemoveAllAssignments}
                    >
                      Törlés
                    </Button>
                  </div>
                </div>
              )}

              {/* Diary Entries */}
              {cleanupData?.diaryEntriesCount > 0 && (
                <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                  <h4 className="font-semibold text-green-900 mb-3 flex items-center gap-2">
                    <span className="bg-green-100 text-green-800 px-2 py-1 rounded text-sm">
                      {cleanupData.diaryEntriesCount}
                    </span>
                    Napló bejegyzés
                  </h4>
                  <div className="flex justify-between items-center bg-white p-2 rounded border">
                    <span className="text-sm">Összes napló bejegyzés törlése</span>
                    <Button
                      size="sm"
                      variant="outline"
                      className="text-green-600 border-green-300 hover:bg-green-50"
                      onClick={handleRemoveDiaryEntries}
                    >
                      Törlés
                    </Button>
                  </div>
                </div>
              )}

              {/* Worker Registry */}
              <div className="bg-red-50 p-4 rounded-lg border border-red-200">
                <h4 className="font-semibold text-red-900 mb-3 flex items-center gap-2">
                  <span className="bg-red-100 text-red-800 px-2 py-1 rounded text-sm">1</span>
                  Munkás regiszter
                </h4>
                <div className="flex justify-between items-center bg-white p-2 rounded border">
                  <div>
                    <span className="font-medium">{worker.name}</span>
                    <span className="text-gray-500 ml-2">({worker.role})</span>
                  </div>
                  <Button
                    size="sm"
                    variant="outline"
                    className={canDeleteFromRegistry 
                      ? "text-red-600 border-red-300 hover:bg-red-50" 
                      : "text-gray-400 border-gray-300 cursor-not-allowed"
                    }
                    onClick={canDeleteFromRegistry ? handleRemoveFromRegistry : undefined}
                    disabled={!canDeleteFromRegistry}
                    title={!canDeleteFromRegistry ? "Először távolítsa el az összes kapcsolatot" : ""}
                  >
                    {canDeleteFromRegistry ? "Deaktiválás" : "Letiltva"}
                  </Button>
                </div>
              </div>

              <div className="bg-gray-100 p-4 rounded-lg">
                <p className="text-sm text-gray-700 mb-3">
                  <strong>Javasolt sorrend:</strong> Először távolítsa el a munkafázis hozzárendeléseket, 
                  majd törölje a napló bejegyzéseket, végül deaktiválja a munkást a regiszterben.
                </p>
                {!canDeleteFromRegistry && (
                  <p className="text-xs text-orange-600 font-medium">
                    ⚠️ A munkás csak akkor deaktiválható, ha minden kapcsolat törölve van.
                  </p>
                )}
              </div>

              <div className="flex justify-between pt-4 border-t">
                <Button
                  type="button"
                  variant="outline"
                  onClick={onClose}
                  disabled={isLoading}
                >
                  Mégse
                </Button>
                <div className="space-x-2">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={handleCleanupAndDelete}
                    disabled={isLoading}
                  >
                    {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                    Minden egyszerre
                  </Button>
                </div>
              </div>
            </div>
          ) : (
            // Simple mode - no connections found
            <>
              <Alert className="border-red-200 bg-red-50">
                <AlertTriangle className="h-4 w-4 text-red-600" />
                <AlertDescription className="text-red-800">
                  Ez a művelet nem visszavonható! A munkás deaktiválásra kerül a rendszerben.
                </AlertDescription>
              </Alert>

              <div className="bg-gray-50 p-4 rounded-lg">
                <h4 className="font-semibold text-gray-900 mb-2">Deaktiválandó munkás:</h4>
                <div className="text-sm text-gray-600">
                  <p><strong>Név:</strong> {worker.name}</p>
                  <p><strong>Szerepkör:</strong> {worker.role}</p>
                </div>
              </div>

              <p className="text-sm text-gray-600">
                Biztosan deaktiválni szeretné <strong>{worker.name}</strong> munkást a rendszerben?
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
                  Deaktiválás
                </Button>
              </div>
            </>
          )}
        </div>
      </DialogContent>
    </Dialog>
  )
}
