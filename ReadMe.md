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

## ⏳ Setup

Before running the Docker containers, you need to create a `.env` file inside the `server/src/` directory with the following environment variables:

```env
POSTGRESQL_DB_URI="postgresql://postgrestest:3f04bae72ad4bdc46b29dcd55e31da9a91a40cd8185995343dbe8093b41119e7@postgres-dev-db:5432/elearndb?schema=public"
JWT_SECRET="your_secret_key_here"
```


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







