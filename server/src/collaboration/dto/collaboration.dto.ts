export interface CollaborationDto {
  id: number;
  learnerId: number;
  tutorId: number;
  status: string;
  createdAt: Date | string;
  learnerName: string;
  learnerLastName: string;
  learnerEmail: string;
  tutorName?: string;
  tutorLastName?: string;
  tutorEmail?: string;
}
