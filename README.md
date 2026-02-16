# School Management Application (SMA)

A comprehensive RESTful API backend for managing schools, built with Next.js, MongoDB, and TypeScript.

## 📋 Project Overview

The School Management Application (SMA) is a full-featured backend system designed to handle the complete lifecycle of school operations. It provides secure authentication, role-based access control, and CRUD operations for managing schools, principals, teachers, and students.

## 🎯 Key Features

### Authentication & Authorization
- **JWT-based Authentication**: Secure token-based authentication using JSON Web Tokens
- **Role-Based Access Control (RBAC)**: Three distinct user roles - Principal, Teacher, and Student
- **Password Security**: bcryptjs for secure password hashing

### User Management
- **Principal Management**: Register principals, update profiles
- **Teacher Management**: Register teachers, assign subjects, manage profiles
- **Student Management**: Register students with document verification, update profiles

### School Management
- **School Registration**: Register schools with DISE codes
- **School Profile Updates**: Update school information
- **Government/Private School Support**: Boolean flag for school type

## 🏗️ Architecture

```
sma/
├── app/
│   └── api/v1/
│       ├── principal/route.ts    # Principal CRUD operations
│       ├── school/route.ts       # School CRUD operations
│       ├── student/route.ts      # Student CRUD operations
│       └── teacher/route.ts      # Teacher CRUD operations
├── models/                       # Mongoose database models
│   ├── principle.ts
│   ├── school.ts
│   ├── student.ts
│   └── techer.ts
├── interfaces/                   # TypeScript interfaces
│   ├── apiResponses/
│   ├── principleInterface/
│   └── token/
├── services/                     # Business logic
│   └── tokenServices/
│       └── jwtTokenServices.ts
├── validations/                  # Zod validation schemas
│   └── requestBody/
├── lib/
│   └── dataBase/
│       └── mongoDb.ts           # MongoDB connection
└── utils/                        # Utility functions
    └── apiResponses/
```

## 🛠️ Tech Stack

| Technology | Purpose |
|------------|---------|
| **Next.js 16** | API Routes & Server-side rendering |
| **MongoDB** | Database |
| **Mongoose** | ODM for MongoDB |
| **TypeScript** | Type safety |
| **Zod** | Request body validation |
| **JWT** | Authentication tokens |
| **bcryptjs** | Password hashing |
| **Tailwind CSS** | Styling |

## 📡 API Endpoints

### Principal Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/principal` | Register a new principal |
| `PATCH` | `/api/v1/principal` | Update principal profile |

### School Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/school` | Register a new school (requires principal auth) |
| `PATCH` | `/api/v1/school` | Update school information |

### Teacher Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/teacher` | Register a new teacher |
| `PATCH` | `/api/v1/teacher` | Update teacher profile |

### Student Endpoints

| Method | Endpoint | Description |
|--------|----------|-------------|
| `POST` | `/api/v1/student` | Register a new student |
| `PATCH` | `/api/v1/student` | Update student profile |

## 🔐 Authentication Flow

1. **Registration**: Users register with required fields
2. **Token Generation**: On successful registration, a JWT token is generated
3. **Token Storage**: Token is stored in HTTP-only cookies
4. **Protected Routes**: Subsequent requests include token in Authorization header
5. **Token Verification**: Middleware verifies token and extracts user role

### Token Payload Structure
```typescript
interface TokenInterface {
  _id: string;        // User ID
  role: "principal" | "teacher" | "student";
  schoolId: string;   // Associated school ID
}
```

## 📝 Data Models

### Principal
- `fullName` - Principal's full name
- `contactNumber` - Phone number
- `email` - Email address (unique)
- `password` - Hashed password
- `bcCode` - Bcrypt code
- `dp` - Display picture URL
- `schoolId` - Associated school (optional)

### School
- `principleId` - Associated principal
- `schoolName` - Name of the school
- `diseCode` - DISE code (unique)
- `address` - Full address
- `pinCode` - PIN code
- `dist` - District
- `state` - State
- `from` - Session start year
- `to` - Session end year
- `logo` - School logo URL
- `isGovt` - Government or private school flag

### Teacher
- `schoolId` - Associated school
- `fullName` - Teacher's full name
- `email` - Email address (unique)
- `password` - Hashed password
- `diseCode` - DISE code
- `address` - Address
- `subjects` - Array of subjects taught
- `contactNumber` - Phone number
- `bcCode` - Bcrypt code
- `isGuest` - Guest teacher flag

### Student
- `schoolId` - Associated school
- `fullName` - Student's full name
- `contactNumber` - Array of phone numbers
- `fatherName` - Father's name
- `motherName` - Mother's name
- `documents` - Aadhar, PAN, SSM ID
- `address` - Address
- `state` - State
- `pinCode` - PIN code
- `diseCode` - DISE code
- `email` - Email address
- `currentClass` - Current class

## 🚀 Getting Started

### Prerequisites
- Node.js 18+
- MongoDB database
- pnpm (or npm/yarn/bun)

### Installation

1. Clone the repository:
```bash
git clone <repository-url>
cd sma
```

2. Install dependencies:
```bash
pnpm install
# or
npm install
```

3. Set up environment variables:
Create a `.env.local` file in the root directory:
```env
MONGODB_URI=your_mongodb_connection_string
JWT_SECRET=your_jwt_secret_key
COOKIE_NAME=your_cookie_name
```

4. Run the development server:
```bash
pnpm dev
# or
npm run dev
```

5. Open [http://localhost:3000](http://localhost:3000) in your browser.

## ✅ Validation

All API requests are validated using **Zod** schemas to ensure:
- Required fields are present
- Data types are correct
- Email formats are valid
- Phone numbers meet length requirements
- Unique constraints are enforced

## 🔒 Security Features

- HTTP-only cookies for token storage
- bcrypt password hashing
- Role-based route protection
- Input validation with Zod
- MongoDB connection management
- Error handling with proper HTTP status codes

## 📦 Available Scripts

| Script | Description |
|--------|-------------|
| `pnpm dev` | Start development server |
| `pnpm build` | Build the application |
| `pnpm start` | Start production server |
| `pnpm lint` | Run ESLint |

## 🤝 Contributing

Contributions are welcome! Please feel free to submit a Pull Request.

## 📄 License

This project is private and for educational purposes.

---

Built with ❤️ using Next.js and MongoDB
