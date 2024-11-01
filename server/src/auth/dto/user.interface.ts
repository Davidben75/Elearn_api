export interface UserWithRole {
  id: number;
  name: string;
  lastname: string;
  email: string;
  status: string;
  company_name?: string;
  role_id: number;
  created_at: Date;
  updated_at: Date;
  isTutor?: boolean; // Ajout de la propriété isTutor
}
