export interface SystemPrompt {
  id: string;
  role: string;
  promptType: "base" | "role_directive";
  content: string;
  version: number;
  isActive: boolean;
  createdAt: string;
  createdBy: string | null;
  notes: string;
}

export interface SystemPromptRepository {
  getActive(role: string, promptType: string): Promise<SystemPrompt | null>;
  listVersions(role: string, promptType: string): Promise<SystemPrompt[]>;
  getByVersion(role: string, promptType: string, version: number): Promise<SystemPrompt | null>;
  createVersion(params: {
    role: string;
    promptType: string;
    content: string;
    createdBy: string;
    notes: string;
  }): Promise<SystemPrompt>;
  activate(role: string, promptType: string, version: number): Promise<void>;
}
