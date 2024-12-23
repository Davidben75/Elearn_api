# lms_api

CDA Final project

# Issue Report

Prisma:
The table 'public.roles' does not exist in the current database.

Solution: In LMS API container, run this command: `npx prisma migrate deploy`.

Mailer:
Cannot find module '@css-inline/css-inline-linux-x64-gnu'.

Solution: In the container app, run these commands:

1. `npm rebuild`
2. `npm install`
