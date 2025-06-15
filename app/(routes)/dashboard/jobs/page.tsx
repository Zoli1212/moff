"use client";

import { useState, useEffect } from 'react';
import { useUser } from '@clerk/nextjs';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Plus, Trash2 } from 'lucide-react';
import { toast } from 'sonner';
import { getSpecialties } from '@/actions/specialty-actions';
import { getWorkflowsBySpecialty } from '@/actions/workflow-actions';
import { getPhases, savePhases } from '@/actions/phases.action';

type Specialty = {
  id: number;
  name: string;
  description: string | null;
};

type Workflow = {
  id: number;
  name: string;
  description: string | null;
};

type Phase = {
  id?: number;
  name: string;
  order: number;
  tasks: {
    id?: number;
    name: string;
    isCompleted: boolean;
  }[];
};

export default function JobsPage() {
  const { user } = useUser();
  const [specialties, setSpecialties] = useState<Specialty[]>([]);
  const [selectedSpecialty, setSelectedSpecialty] = useState<string>('');
  const [workflows, setWorkflows] = useState<Workflow[]>([]);
  const [selectedWorkflow, setSelectedWorkflow] = useState<string>('');
  const [phases, setPhases] = useState<Phase[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Load specialties on component mount
  useEffect(() => {
    const fetchSpecialties = async () => {
      if (!user) return;
      
      try {
        const data = await getSpecialties();
        setSpecialties(data);
      } catch (error) {
        console.error('Error fetching specialties:', error);
      } finally {
        setIsLoading(false);
      }
    };

    fetchSpecialties();
  }, [user]);

  // Load workflows when specialty is selected
  useEffect(() => {
    const fetchWorkflows = async () => {
      if (!selectedSpecialty) return;
      
      try {
        const data = await getWorkflowsBySpecialty(Number(selectedSpecialty));
        setWorkflows(data);
      } catch (error) {
        console.error('Error fetching workflows:', error);
      }
    };

    fetchWorkflows();
  }, [selectedSpecialty]);

  // Load phases when workflow is selected
  useEffect(() => {
    const fetchPhases = async () => {
      if (!selectedWorkflow) return;
      
      try {
        const data = await getPhases(Number(selectedWorkflow));
        setPhases(data);
      } catch (error) {
        console.error('Error fetching phases:', error);
      }
    };

    fetchPhases();
  }, [selectedWorkflow]);

  const handleAddPhase = () => {
    setPhases([...phases, { name: '', order: phases.length + 1, tasks: [] }]);
  };

  const handlePhaseNameChange = (index: number, value: string) => {
    const newPhases = [...phases];
    newPhases[index].name = value;
    setPhases(newPhases);
  };

  const handleAddTask = (phaseIndex: number) => {
    const newPhases = [...phases];
    newPhases[phaseIndex].tasks.push({
      name: '',
      isCompleted: false
    });
    setPhases(newPhases);
  };

  const handleTaskNameChange = (phaseIndex: number, taskIndex: number, value: string) => {
    const newPhases = [...phases];
    newPhases[phaseIndex].tasks[taskIndex].name = value;
    setPhases(newPhases);
  };

  const handleRemovePhase = (index: number) => {
    const newPhases = phases.filter((_, i) => i !== index);
    // Update order
    const reorderedPhases = newPhases.map((phase, idx) => ({
      ...phase,
      order: idx + 1
    }));
    setPhases(reorderedPhases);
  };

  const handleRemoveTask = (phaseIndex: number, taskIndex: number) => {
    const newPhases = [...phases];
    newPhases[phaseIndex].tasks = newPhases[phaseIndex].tasks.filter((_, i) => i !== taskIndex);
    setPhases(newPhases);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedWorkflow) return;
    
    setIsSubmitting(true);
    
    try {
      await savePhases(
        Number(selectedWorkflow),
        phases.map(phase => ({
          name: phase.name,
          order: phase.order,
          tasks: phase.tasks.map(task => ({
            name: task.name,
            isCompleted: task.isCompleted,
            order: 0 // Add default order if needed
          }))
        }))
      );
      
      // Reset form
      setPhases([]);
      setSelectedWorkflow('');
      setSelectedSpecialty('');
      
      toast.success('A fázisok sikeresen elmentve!');
    } catch (error) {
      console.error('Error saving phases:', error);
      toast.error('Nem sikerült elmenteni a fázisokat');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (isLoading) {
    return <div>Betöltés...</div>;
  }

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-bold mb-6">Munkafolyamat Kezelés</h1>
      
      <Card className="mb-6">
        <CardHeader>
          <CardTitle>Szakterület és Munkafolyamat Kiválasztása</CardTitle>
          <CardDescription>Válassz szakmát és munkafolyamatot a fázisok és feladatok kezeléséhez</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-4">
            <div>
              <Label htmlFor="specialty">Szakma</Label>
              <Select 
                value={selectedSpecialty} 
                onValueChange={(value: string) => {
                  setSelectedSpecialty(value);
                  setSelectedWorkflow('');
                  setPhases([]);
                }}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Válassz szakmát" />
                </SelectTrigger>
                <SelectContent>
                  {specialties.map((specialty) => (
                    <SelectItem key={specialty.id} value={specialty.id.toString()}>
                      {specialty.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            
            <div>
              <Label htmlFor="workflow">Munkafolyamat</Label>
              <Select 
                value={selectedWorkflow} 
                onValueChange={setSelectedWorkflow}
                disabled={!selectedSpecialty}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Válassz munkafolyamatot" />
                </SelectTrigger>
                <SelectContent>
                  {workflows.map((workflow) => (
                    <SelectItem key={workflow.id} value={workflow.id.toString()}>
                      {workflow.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      {selectedWorkflow && (
        <form onSubmit={handleSubmit}>
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <div>
                <CardTitle>Fázisok és Feladatok</CardTitle>
                <CardDescription>Fázisok és hozzájuk tartozó feladatok hozzáadása és kezelése</CardDescription>
              </div>
              <Button 
                type="button" 
                variant="outline" 
                size="sm" 
                onClick={handleAddPhase}
              >
                <Plus className="mr-2 h-4 w-4" /> Fázis Hozzáadása
              </Button>
            </CardHeader>
            <CardContent>
              {phases.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  Még nincsenek fázisok. Kattints a &quot;Fázis Hozzáadása&quot; gombra a kezdéshez.
                </div>
              ) : (
                <div className="space-y-6">
                  {phases.map((phase, phaseIndex) => (
                    <Card key={phaseIndex} className="overflow-hidden">
                      <div className="bg-muted/50 p-4 flex justify-between items-center">
                        <div className="flex-1">
                          <Input
                            type="text"
                            placeholder="Fázis neve"
                            value={phase.name}
                            onChange={(e) => handlePhaseNameChange(phaseIndex, e.target.value)}
                            required
                          />
                        </div>
                        <Button
                          type="button"
                          variant="ghost"
                          size="icon"
                          className="ml-2 text-destructive hover:bg-destructive/10 hover:text-destructive"
                          onClick={() => handleRemovePhase(phaseIndex)}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                      <div className="p-4 pt-2 space-y-2">
                        {phase.tasks.map((task, taskIndex) => (
                          <div key={taskIndex} className="flex items-center gap-2">
                            <Input
                              type="text"
                              placeholder="Feladat neve"
                              value={task.name}
                              onChange={(e) => 
                                handleTaskNameChange(phaseIndex, taskIndex, e.target.value)
                              }
                              required
                              className="flex-1"
                            />
                            <Button
                              type="button"
                              variant="ghost"
                              size="icon"
                              className="text-destructive hover:bg-destructive/10 hover:text-destructive"
                              onClick={() => handleRemoveTask(phaseIndex, taskIndex)}
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        ))}
                        <Button
                          type="button"
                          variant="outline"
                          size="sm"
                          className="mt-2"
                          onClick={() => handleAddTask(phaseIndex)}
                        >
                          <Plus className="mr-2 h-4 w-4" /> Feladat Hozzáadása
                        </Button>
                      </div>
                    </Card>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
          
          {phases.length > 0 && (
            <div className="mt-6 flex justify-end">
              <Button type="submit" disabled={isSubmitting}>
                {isSubmitting ? 'Mentés...' : 'Fázisok Mentése'}
              </Button>
            </div>
          )}
        </form>
      )}
    </div>
  );
}
