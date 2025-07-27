// WorkItemAIResult interface for stricter typing in updateWorkWithAIResult
export interface WorkItemAIResult {
  tools?: string[] | string;
  materials?: string[] | string;
  // add other fields as needed
}

export interface AIResult {
  workItems: WorkItemAIResult[];
  // add other fields as needed
}
