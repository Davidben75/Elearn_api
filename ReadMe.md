# 📚 eLearn - Backend

Welcome to the backend of **eLearn**, an online learning platform designed to streamline content delivery, user management, and course enrollment through a robust and scalable API.

## 🚀 Project Overview

The **eLearn** backend is a RESTful API built using **[NestJS](https://nestjs.com/)**, with **Prisma** as the ORM for PostgreSQL database interactions. The backend is containerized using **Docker** for easy deployment and scalability. It also integrates **Nodemailer** for email notifications (e.g. account confirmation, password reset).

---

## ⚙️ Tech Stack

- **Framework**: NestJS (TypeScript)
- **ORM**: Prisma
- **Database**: PostgreSQL
- **Email Service**: Nodemailer (SMTP)
- **Containerization**: Docker + Docker Compose
- **Environment Management**: dotenv

---

## 🐳 Docker Usage
```bash
docker-compose up --build
```
This will spin up:
- NestJS app (port 3000)
- PostgreSQL DB (default port 5432)

## 🏗️ Development 
```bash
npx prisma generate
npx prisma migrate dev
```

## Features 
- User Registration & Login (JWT)
- Role-based access (e.g. admin, tutor)
- Course creation, update, deletion
- Enrollment management
- Email notifications
- Input validation & error handling
- Security : JWT, argon2 (password)







