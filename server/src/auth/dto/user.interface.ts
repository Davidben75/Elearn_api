export interface UserWithRole {
  id: number;
  name: string;
  lastname: string;
  email: string;
  role: string;
  status: string;
  companyName?: string;
  createdAt: Date;
}
