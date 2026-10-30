# Praman

APAAR ID-based student data management and verification platform for AICTE-approved institutions (Smart India Hackathon).

## Run locally

Needs Node 22.5+ (uses the built-in SQLite). Copy `.env.example` to `.env` and fill it in (everything is optional).

```bash
cd server && npm install && npm run seed && npm start   # API on :4000
cd client && npm install && npm run dev                 # UI on :5173
```

`npm run build` in `client/` makes the API serve the UI on a single port.

## Demo logins

| Role | Email | Password |
|---|---|---|
| AICTE admin | admin@aicte.demo | Admin@123 |
| Institution | institute@demo.edu | Inst@123 |
| Employer | employer@demo.com | Emp@123 |
| Regulator | regulator@demo.gov | Reg@123 |
| Student | student@demo.in | Stud@123 |

All student data is synthetic. Institutions are fictional.
