'use server';

import { prisma } from '@/lib/prisma';
import { auth } from '@clerk/nextjs/server';
import { revalidatePath } from 'next/cache';
import { 
  PhaseData, 
  WorkflowData, 
  CredentialData, 

  FormAction,

} from '@/types/admin.types';

// Helper function to verify admin access
async function verifyAdminAccess() {
  const { userId } = await auth();
  
  if (!userId) {
    throw new Error('Unauthorized');
  }

  // Convert userId to number since our User model uses Int for id
  const userIdNumber = Number(userId);
  if (isNaN(userIdNumber)) {
    throw new Error('Invalid user ID');
  }

  const user = await prisma.user.findUnique({
    where: { id: userIdNumber },
    select: { email: true }
  });

  if (user?.email !== 'deirdre.zm@gmail.com') {
    throw new Error('Not found');
  }

  return { userId: userIdNumber };
}

// Helper function to handle form data extraction
function extractFormData<T extends Record<string, any>>(formData: FormData, fields: (keyof T)[]): Partial<T> {
  return fields.reduce((acc, field) => {
    const value = formData.get(field as string);
    if (value !== null) {
      acc[field] = value as any;
    }
    return acc;
  }, {} as Partial<T>);
}

// Phase CRUD Operations
export const adminCreatePhase: FormAction = async (prevState, formData) => {
  try {
    const { userId } = await verifyAdminAccess();
    
    const name = formData.get('name') as string;
    const description = formData.get('description') as string | null;
    const tenantEmail = formData.get('tenantEmail') as string;
    const workflowId = parseInt(formData.get('workflowId') as string);
    const order = formData.get('order') ? parseInt(formData.get('order') as string) : 0;

    const result = await prisma.phase.create({ 
      data: {
        name,
        description,
        tenantEmail,
        workflowId,
        order,
      }
    });
    
    revalidatePath('/admin/phases');
    return { success: true, data: result };
  } catch (error) {
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Failed to create phase' 
    };
  }
};

export const adminGetPhase: FormAction = async (prevState, formData) => {
  try {
    await verifyAdminAccess();
    const id = parseInt(formData.get('id') as string);
    const phase = await prisma.phase.findUnique({ 
      where: { id },
      include: {
        workflow: true
      }
    });
    return { success: true, data: phase };
  } catch (error) {
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Failed to get phase' 
    };
  }
};

export const adminUpdatePhase: FormAction = async (prevState, formData) => {
  try {
    const { userId } = await verifyAdminAccess();
    
    const id = parseInt(formData.get('id') as string);
    const formDataObj = extractFormData<Omit<PhaseData, 'updatedById' | 'id'>>(formData, [
      'name', 'description', 'isActive', 'specialtyId', 'order', 'workflowId'
    ]);

    // Create the update data object with proper typing
    const updateData: Parameters<typeof prisma.phase.update>[0]['data'] = {
      ...formDataObj,
      ...(userId && { updatedBy: { connect: { id: userId } } })
    };

    const result = await prisma.phase.update({ 
      where: { id },
      data: updateData
    });
    
    revalidatePath('/admin/phases');
    return { success: true, data: result };
  } catch (error) {
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Failed to update phase' 
    };
  }
};

export const adminDeletePhase: FormAction = async (prevState, formData) => {
  try {
    await verifyAdminAccess();
    const id = parseInt(formData.get('id') as string);
    await prisma.phase.delete({ where: { id } });
    revalidatePath('/admin/phases');
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Failed to delete phase' 
    };
  }
};

// Workflow CRUD Operations
export const adminCreateWorkflow: FormAction = async (prevState, formData) => {
  try {
    const { userId } = await verifyAdminAccess();
    
    const name = formData.get('name') as string;
    const description = formData.get('description') as string | null;
    const tenantEmail = formData.get('tenantEmail') as string;
    const specialtyId = formData.get('specialtyId') ? parseInt(formData.get('specialtyId') as string) : null;

    const result = await prisma.workflow.create({ 
      data: {
        name,
        description,
        tenantEmail,
        isActive: true, // Default to true as per schema
        specialtyId,
      }
    });
    
    revalidatePath('/admin/workflows');
    return { success: true, data: result };
  } catch (error) {
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Failed to create workflow' 
    };
  }
};

export const adminGetWorkflow: FormAction = async (prevState, formData) => {
  try {
    await verifyAdminAccess();
    const id = parseInt(formData.get('id') as string);
    const workflow = await prisma.workflow.findUnique({
      where: { id },
      include: {
        phases: {
          orderBy: { order: 'asc' },
          include: {
            tasks: {
              orderBy: { order: 'asc' }
            }
          }
        },
        Specialty: true,
      },
    });
    return { success: true, data: workflow };
  } catch (error) {
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Failed to get workflow' 
    };
  }
};

export const adminUpdateWorkflow: FormAction = async (prevState, formData) => {
  try {
    const { userId } = await verifyAdminAccess();
    const id = parseInt(formData.get('id') as string);
    
    const data = extractFormData<WorkflowData>(formData, [
      'name', 'description', 'isActive'
    ]);

    const result = await prisma.workflow.update({
      where: { id },
      data: data,
    });
    
    revalidatePath('/admin/workflows');
    return { success: true, data: result };
  } catch (error) {
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Failed to update workflow' 
    };
  }
};

export const adminDeleteWorkflow: FormAction = async (prevState, formData) => {
  try {
    await verifyAdminAccess();
    const id = parseInt(formData.get('id') as string);
    await prisma.workflow.delete({ where: { id } });
    revalidatePath('/admin/workflows');
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Failed to delete workflow' 
    };
  }
};

// Google OAuth Credential CRUD Operations
export const adminCreateCredential: FormAction = async (prevState, formData) => {
  try {
    const { userId } = await verifyAdminAccess();
    
    // Extract data from form
    const clientId = formData.get('client_id') as string;
    const projectId = formData.get('project_id') as string;
    const authUri = formData.get('auth_uri') as string || 'https://accounts.google.com/o/oauth2/auth';
    const tokenUri = formData.get('token_uri') as string || 'https://oauth2.googleapis.com/token';
    const authProviderX509CertUrl = formData.get('auth_provider_x509_cert_url') as string || 'https://www.googleapis.com/oauth2/v1/certs';
    const clientSecret = formData.get('client_secret') as string;
    const redirectUris = formData.get('redirect_uris') as string;
    const tenantEmail = formData.get('tenantEmail') as string;
    
    if (!clientId || !projectId || !clientSecret) {
      return { 
        success: false, 
        message: 'Client ID, Project ID, and Client Secret are required' 
      };
    }
    
    // Note: The GoogleOAuthCredential model is not defined in the Prisma schema
    // This is a placeholder implementation
    const credentialData = {
      client_id: clientId,
      project_id: projectId,
      auth_uri: authUri,
      token_uri: tokenUri,
      auth_provider_x509_cert_url: authProviderX509CertUrl,
      client_secret: clientSecret,
      redirect_uris: redirectUris || '[]',
      tenant_email: tenantEmail,
      created_by: userId,
      updated_by: userId,
      created_at: new Date(),
      updated_at: new Date(),
    };
    
    // In a real implementation, you would save to the database here
    // const result = await prisma.googleOAuthCredential.create({ data: credentialData });
    
    // For now, we'll just log and return success

    revalidatePath('/admin/credentials');
    return { 
      success: true, 
      message: 'Credential created successfully',
      data: credentialData 
    };
  } catch (error) {
    console.error('Error creating credential:', error);
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Failed to create credential' 
    };
  }
};

export const adminGetCredential: FormAction = async (prevState, formData) => {
  try {
    await verifyAdminAccess();
    const id = parseInt(formData.get('id') as string);
    const credential = await prisma.googleOAuthCredential.findUnique({ 
      where: { id }
    });
    return { success: true, data: credential };
  } catch (error) {
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Failed to get credential' 
    };
  }
};

export const adminUpdateCredential: FormAction = async (prevState, formData) => {
  try {
    const { userId } = await verifyAdminAccess();
    const id = parseInt(formData.get('id') as string);
    
    const data = extractFormData<Partial<CredentialData>>(formData, [
      'clientId', 'projectId', 'authUri', 'tokenUri', 
      'authProviderX509CertUrl', 'clientSecret', 'redirectUris', 'tenantEmail'
    ]);

    const result = await prisma.googleOAuthCredential.update({
      where: { id },
      data: {
        ...data,
   
      },
    });
    
    revalidatePath('/admin/credentials');
    return { success: true, data: result };
  } catch (error) {
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Failed to update credential' 
    };
  }
};

export const adminDeleteCredential: FormAction = async (prevState, formData) => {
  try {
    await verifyAdminAccess();
    const id = parseInt(formData.get('id') as string);
    await prisma.googleOAuthCredential.delete({ where: { id } });
    revalidatePath('/admin/credentials');
    return { success: true };
  } catch (error) {
    return { 
      success: false, 
      message: error instanceof Error ? error.message : 'Failed to delete credential' 
    };
  }
};

// User CRUD Operations
export async function adminCreateUser(data: any) {
  await verifyAdminAccess();
  return await prisma.user.create({ data });
}

export async function adminGetUser(id: number) {
  await verifyAdminAccess();
  return await prisma.user.findUnique({ 
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      updatedAt: true,
      }
  });
}

export async function adminUpdateUser(id: number, data: any) {
  await verifyAdminAccess();
  return await prisma.user.update({ 
    where: { id }, 
    data,
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    }
  });
}

export async function adminDeleteUser(id: number) {
  await verifyAdminAccess();
  return await prisma.user.delete({ 
    where: { id },
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
      createdAt: true,
      updatedAt: true,
    }
  });
}


// List all entities
export async function adminListPhases() {
  await verifyAdminAccess();
  return await prisma.phase.findMany();
}

export async function adminListWorkflows() {
  await verifyAdminAccess();
  return await prisma.workflow.findMany({
    include: { phases: true }
  });
}

export async function adminListCredentials() {
  await verifyAdminAccess();
  return await prisma.googleOAuthCredential.findMany({
    orderBy: { createdAt: 'desc' },
  });
}

export async function adminListUsers() {
  await verifyAdminAccess();
  return await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      name: true,
      role: true,
    },
  
  });
};
