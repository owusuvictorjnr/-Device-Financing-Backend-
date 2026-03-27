# Backend Copilot Instructions

## Device Financing & Remote Device Control Platform

---

# Purpose

These instructions guide GitHub Copilot to generate backend code that follows the architecture, conventions, and standards of the **Device Financing & Remote Device Control Platform**.

The backend must be:

* Scalable
* Modular
* Secure
* Production-ready
* Device-agnostic
* Event-driven
* Maintainable

The system manages:

* Device financing
* Payment tracking
* Device lock/unlock enforcement
* User roles (Admin, Agent, Customer)
* Future IoT device integration

---

# Technology Stack

The backend uses:

Node.js
TypeScript
NestJS
PostgreSQL
Prisma ORM
Redis
BullMQ

---

# Architecture Principles

Copilot must always generate code that follows these principles:

1. Modular architecture
2. Separation of concerns
3. Dependency injection
4. Role-based access control
5. Event-driven design
6. Database-first design
7. DTO validation
8. Clean code standards
9. Async/await patterns
10. Error-safe operations

---

# Core System Roles

The system supports three user roles:

ADMIN
AGENT
CUSTOMER

---

# Role Definitions

## ADMIN

Full system access.

Responsibilities:

* Create agents
* Register devices
* Assign loans
* Lock and unlock devices
* View system reports
* Manage customers
* Manage payments

---

## AGENT

Field operator.

Responsibilities:

* Register customers
* Assign devices
* Create loans
* Record payments
* View assigned customers

---

## CUSTOMER

End user.

Responsibilities:

* View loan details
* Make payments
* View payment history
* Track remaining balance
* Check device status

---

# Database Design Rules

Copilot must always follow these database rules:

* Use UUID as primary key
* Use snake_case for database fields
* Use camelCase in TypeScript
* Use Prisma schema definitions
* Use soft delete pattern
* Use timestamps
* Use relational integrity
* Never duplicate data

---

# Required Base Fields

Every database model must include:

id
created_at
updated_at

Optional:

deleted_at

---

# Core Database Models

Copilot must generate the following models.

---

## User

Fields:

id
name
phone
email
password_hash
role
status
created_at
updated_at
deleted_at

Role values:

ADMIN
AGENT
CUSTOMER

Status values:

ACTIVE
INACTIVE
SUSPENDED

---

## Agent

Fields:

id
user_id
region
commission_rate
created_at
updated_at

---

## Customer

Fields:

id
user_id
agent_id
national_id
address
created_at
updated_at

---

## Device

Fields:

id
serial_number
device_type
platform
model
status
customer_id
last_seen
created_at
updated_at

Device type values:

ANDROID_PHONE
IOT_RELAY
TV
FRIDGE
SOLAR_SYSTEM

Platform values:

ANDROID
IOS
IOT

---

## Loan

Fields:

id
customer_id
device_id
agent_id
principal_amount
installment_amount
duration_days
start_date
due_date
grace_period_days
status
created_at
updated_at

Status values:

ACTIVE
PAID
OVERDUE
DEFAULTED

---

## Payment

Fields:

id
loan_id
amount
payment_method
reference
status
paid_at
recorded_by
created_at
updated_at

Recorded by values:

AGENT
CUSTOMER
SYSTEM

---

## Command

Fields:

id
device_id
command_type
status
sent_at
acknowledged_at
retry_count
created_at
updated_at

Command type values:

LOCK
UNLOCK
SYNC
TURN_OFF_POWER
TURN_ON_POWER

---

# Backend Module Structure

Copilot must generate modules using this structure.

src/

auth/
users/
agents/
customers/
devices/
loans/
payments/
commands/
notifications/
jobs/

common/

guards/
interceptors/
filters/
decorators/
utils/

config/

database.ts
redis.ts

main.ts
app.module.ts

---

# NestJS Module Pattern

Copilot must generate:

Controller
Service
DTO
Entity
Module

Example:

users/

users.controller.ts
users.service.ts
users.module.ts
dto/

create-user.dto.ts
update-user.dto.ts

---

# DTO Rules

Copilot must:

* Use class-validator
* Validate all inputs
* Use strong typing
* Reject invalid requests

Example:

Use:

IsString
IsEmail
IsUUID
IsNumber
IsEnum

Never allow unvalidated input.

---

# API Design Rules

Copilot must always:

Use RESTful endpoints
Use proper HTTP methods
Use consistent naming
Return JSON responses
Use versioned routes

---

## Route Prefix

/api/v1

---

# API Response Format

Success:

{
"status": "success",
"data": {}
}

Error:

{
"status": "error",
"message": "Error message"
}

---

# Authentication Rules

The system uses:

JWT authentication
Role-based authorization

Copilot must:

Protect routes using guards
Validate JWT tokens
Check user roles

---

# Authorization Guard

Copilot must generate:

RolesGuard

Capabilities:

Allow ADMIN full access
Restrict AGENT to assigned customers
Restrict CUSTOMER to own data

---

# Password Security

Copilot must:

Use bcrypt hashing
Never store plain passwords
Hash passwords before saving

---

# Device Command System

Copilot must implement a command system.

Commands are stored in database.

Commands are processed by workers.

Example:

LOCK
UNLOCK

---

# Background Jobs

Copilot must use BullMQ.

---

## Required Workers

### Payment Enforcement Worker

Runs:

Daily

Purpose:

Check overdue loans.

If payment overdue:

Create LOCK command.

---

### Command Retry Worker

Runs:

Every 5 minutes

Purpose:

Retry failed commands.

---

### Reminder Worker

Runs:

Daily

Purpose:

Send payment reminders.

---

# Redis Usage

Redis is used for:

Queue processing
Job scheduling
Retry logic
Background workers

---

# Logging Rules

Copilot must use:

Pino logger

Log:

Errors
Warnings
Requests
System events

---

# Error Handling Rules

Copilot must:

Use try/catch
Throw HttpException
Use global exception filter

Never crash the server.

---

# Date Handling Rules

Copilot must use:

dayjs

Never use raw Date logic for calculations.

---

# Naming Conventions

Use:

camelCase for variables
PascalCase for classes
snake_case for database fields

---

# Code Quality Rules

Copilot must:

Write readable code
Avoid duplication
Use dependency injection
Follow SOLID principles
Use async/await
Use strong typing

---

# Device-Agnostic Design Rule

The system must treat all devices equally.

Never create:

android_devices
iot_devices

Always use:

devices

Use:

device_type
platform

---

# Event-Driven Rule

Copilot must emit events for:

Payment received
Loan overdue
Device locked
Device unlocked

Example:

payment.received
loan.overdue
device.locked

---

# Soft Delete Rule

Copilot must:

Use deleted_at field
Never permanently delete records

---

# Health Check Endpoint

Copilot must generate:

GET /health

Return:

Database status
Redis status

---

# Swagger Documentation

Copilot must:

Generate Swagger API documentation.

Endpoint:

/api/docs

---

# Future Integration Rule

Copilot must ensure:

The backend can support IoT devices later without redesign.

---

# Forbidden Practices

Copilot must never:

Use plain passwords
Skip validation
Hardcode secrets
Use synchronous blocking code
Duplicate business logic
Delete financial records
Ignore error handling

---

# Development Mode

The backend must support:

Hot reload
Development logging
Environment configuration

---

# Production Mode

The backend must support:

Secure authentication
Rate limiting
Logging
Error monitoring
Database migrations
Background workers

---

# Summary

This backend must support:

Admin dashboard
Agent dashboard
Customer dashboard
Device financing
Payment tracking
Device lock/unlock enforcement
Background automation
Future IoT integration
Production deployment
