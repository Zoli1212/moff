export type ActionState<T = any> = {
  success: boolean;
  message?: string;
  data?: T;
  errors?: Record<string, string[]>;
};

type BaseEntity = {
  id?: number;
  name: string;
  description?: string | null;
  tenantEmail: string;
  isActive?: boolean;
  createdAt?: Date;
  updatedAt?: Date;
};

export type PhaseData = BaseEntity & {
  specialtyId?: number | null;
  updatedById?: number | null;
  order: number;
  workflowId: number;
  // Add phase-specific fields here
};

export type WorkflowData = BaseEntity & {
  // Add workflow-specific fields here
};

export type CredentialData = BaseEntity & {
  clientId: string;
  projectId: string;
  authUri: string;
  tokenUri: string;
  authProviderX509CertUrl: string;
  clientSecret: string;
  redirectUris: any;
};

export type UserData = {
  id?: number;
  name: string;
  email: string;
  isActive?: boolean;
  // Add other user fields as needed
};

// For form submissions
export type FormAction<T = any> = (prevState: ActionState, formData: FormData) => Promise<ActionState<T>>;

// For direct API calls
export type ApiAction<T = any, P = any> = (params: P) => Promise<ActionState<T>>;
