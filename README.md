# User Management Service (NestJS + gRPC)

A modular, type-safe user management microservice built with **NestJS**, **gRPC**, and **RxJS**.  
This service provides user registration, authentication (JWT), listing, and paginated querying via reactive streams.

---

## Author

**Daniel Ocenas**

---

## Features

- **NestJS** backend with gRPC transport
- **JWT-based authentication** (using `@nestjs/jwt`)
- **Reactive pagination** with RxJS `Subject`
- **Layered architecture** (Controller / Service separation)
- **Validation** with class-validator and class-transformer
- **In-memory user storage** (for simplicity; extendable to database)
- **Protocol Buffers** for strongly typed request/response models

---

## Installation

### Install dependencies

```npm install```

### Generate gRPC code from .proto files

```npm run proto:generate```

### Start development server and client localy

```npm run start:server```

```npm run start:client```

---

## License

MIT © 2025 — Developed using NestJS and TypeScript
