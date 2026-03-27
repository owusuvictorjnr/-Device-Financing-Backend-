# GitHub Copilot Review Instructions

## Staging Code Validation Rules — Device Financing Backend

---

# Purpose

These rules define strict validation requirements for all code changes before deployment to the **production** branch.

The staging branch acts as a controlled validation environment where:

* Code quality is enforced
* Security is verified
* Type safety is guaranteed
* Performance risks are minimized
* Production stability is protected

No code may be merged into production unless all staging checks pass.

---

# Enforcement Scope

These rules apply to:

* Controllers
* Services
* DTOs
* Guards
* Workers
* Database access
* API responses
* Authentication logic
* Background jobs
* Device command logic
* Payment processing logic

---

# Branch Protection Policy

Production branch must:

Require:

* Pull request approval
* Successful CI checks
* Passing tests
* Passing lint rules
* Passing type checks

Disallow:

Direct commits
Force pushes
Unreviewed merges

---

# Mandatory Pre-Production Validation

Every staging deployment must pass:

TypeScript compilation
Lint validation
Unit tests
Integration tests
Security validation
Database migration validation
Environment validation

Failure in any step must block deployment.

---

# Type Safety Rules (STRICT)

These rules are mandatory.

---

## Forbidden Types

Never use:

any
unknown
as any
Function
Object
implicit any

Example:

BAD

const data: any = response

GOOD

const data: UserResponseDto = response

---

## Required TypeScript Configuration

tsconfig must enforce:

strict
noImplicitAny
strictNullChecks
noUnusedLocals
noUnusedParameters
noFallthroughCasesInSwitch

---

# DTO Validation Rules

All incoming data must be validated.

Every DTO must:

Use class-validator
Use class-transformer
Define explicit types
Reject invalid values

---

## Forbidden

Missing validation decorators
Unvalidated request body
Direct use of request data

---

Example:

BAD

createUser(data)

GOOD

createUser(createUserDto)

---

# Controller Rules

Controllers must:

Contain no business logic
Delegate logic to services
Validate all input
Return standardized responses

---

Forbidden:

Database queries inside controllers
Complex logic inside controllers
Direct Prisma calls inside controllers

---

# Service Rules

Services must:

Contain business logic
Be stateless
Use dependency injection
Handle errors properly

---

Forbidden:

HTTP request handling
Direct response manipulation
Silent error swallowing

---

# Database Rules

All database operations must:

Use Prisma ORM
Use transactions when needed
Handle failures
Prevent data corruption

---

Mandatory:

Use transactions for:

Payments
Loan updates
Device lock actions

---

Example:

Payment processing must be atomic.

---

# Security Rules

Authentication and authorization must be enforced.

---

Mandatory:

JWT validation
Role-based access control
Input validation
Output sanitization

---

Forbidden:

Plain-text passwords
Weak hashing
Hardcoded secrets
Exposed tokens

---

Passwords must use:

bcrypt hashing

---

# API Response Rules

All responses must follow:

Success:

{
status: "success",
data: {}
}

Error:

{
status: "error",
message: "Error message"
}

---

Forbidden:

Raw database responses
Stack traces in responses
Unstructured responses

---

# Logging Rules

All critical operations must be logged.

---

Mandatory Logging:

User login
Payment recorded
Loan created
Device locked
Device unlocked
System errors

---

Log Format:

JSON structured logs

---

# Error Handling Rules

All services must:

Use try/catch
Throw explicit exceptions
Return safe error messages

---

Forbidden:

Unhandled promise rejections
Silent failures
Generic error responses

---

# Environment Rules

Environment variables must be validated.

---

Mandatory:

Use configuration validation schema
Fail fast on missing variables

---

Example Required Variables:

DATABASE_URL
REDIS_HOST
JWT_SECRET
NODE_ENV

---

# Performance Rules

Code must be optimized.

---

Mandatory:

Use pagination for list endpoints
Use indexing for database queries
Avoid blocking operations

---

Forbidden:

Loading entire datasets
Unbounded loops
Synchronous file operations

---

# Background Job Rules

Workers must:

Retry failed jobs
Log failures
Prevent duplicate execution

---

Mandatory:

Idempotent job design

---

Example:

Device lock job must not execute twice.

---

# Device Command Safety Rules

Commands affecting devices must:

Be validated
Be logged
Be retry-safe
Be reversible

---

Mandatory:

LOCK
UNLOCK

Must be tracked with:

status
timestamp
retry count

---

# Migration Safety Rules

Database migrations must:

Be versioned
Be reversible
Be tested in staging

---

Forbidden:

Manual database schema changes

---

# Code Quality Rules

All code must:

Follow SOLID principles
Use dependency injection
Avoid duplication
Use meaningful names
Be readable

---

Forbidden:

Magic numbers
Hardcoded values
Nested complexity
Unused code

---

# Testing Rules

All critical logic must be tested.

---

Mandatory Tests:

Authentication
Payment processing
Loan lifecycle
Device command execution
Worker jobs

---

Minimum Coverage:

80 percent

---

# CI Pipeline Enforcement

Staging pipeline must run:

Type checking
Lint validation
Tests
Build
Migration validation

---

Production deployment must be blocked if:

Tests fail
Lint fails
Build fails
Migration fails

---

# Automated Commands Required

The CI pipeline must execute:

yarn install

yarn build

yarn lint

yarn test

yarn prisma generate

yarn prisma migrate deploy

---

# Production Merge Gate

Production branch merge is allowed only if:

All CI checks pass
Code review is approved
Tests pass
Security checks pass
Build succeeds

---

# Forbidden Practices (Critical)

Never allow:

any type usage
console.log in production
Hardcoded secrets
Skipping validation
Direct database access from controllers
Unhandled errors
Silent failures
Manual production database changes

---

# Required Development Workflow

Developer workflow must follow:

Create feature branch

↓

Commit code

↓

Push to staging

↓

Run CI validation

↓

Fix failures

↓

Merge to production

---

# Summary

These rules ensure:

Code safety
Type safety
Security
Performance
Reliability
Production stability

Staging exists to protect production.
