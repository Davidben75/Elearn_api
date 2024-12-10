export interface UserWithRole {
  id: number;
  name: string;
  lastname: string;
  email: string;
  status: string;
  companyName?: string;
  createdAt: Date;
  isTutor: boolean; // Add is Tutor property
  isAdmin: boolean;
}
