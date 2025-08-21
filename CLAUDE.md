# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## CRITICAL REQUIREMENTS - MUST FOLLOW

### 1. ALWAYS CHECK VERCEL DEPLOYMENT AFTER GIT PUSH

**MANDATORY**: After EVERY `git push` command, you MUST:

1. Wait 45-60 seconds for deployment
2. Run `vercel ls | head -5` to get latest deployment URL
3. Check build status with: `vercel inspect --logs <deployment-url> | tail -20 | grep -E "(error|Error|failed|Failed)"`
4. Confirm deployment succeeded before responding to user

**NEVER** skip this step. The user has explicitly requested this and it's critical for debugging.

## Project Overview

TCS Purchase Order Hub - A Next.js application that extracts data from customer proposal PDFs using OpenAI and generates professional purchase orders.

## Essential Commands

```bash
# Development
npm run dev              # Start development server on http://localhost:3000
npm run build            # Build production bundle
npm run start            # Start production server
npm run lint             # Run ESLint
npm run type-check       # Check TypeScript types without emitting
npm test                 # Run Jest tests
npm run test:watch       # Run tests in watch mode

# Deployment (after git push)
vercel ls | head -5                                          # Get latest deployment URL
vercel inspect --logs <deployment-url> | tail -20           # Check deployment logs
```

## Architecture

### Core Technology Stack
- **Framework**: Next.js 14.2.31 with App Router + TypeScript
- **State**: Zustand for global state, Dexie for client-side database
- **AI**: OpenAI API for PDF parsing and extraction
- **PDF**: pdf-parse for reading, jsPDF for generation
- **UI**: Radix UI components + Tailwind CSS with custom design system
- **Forms**: React Hook Form + Zod validation

### Key API Routes
- `/api/parse-proposal-openai` - Main PDF parsing endpoint using OpenAI file upload
- `/api/generate-po` - Generates PDF purchase orders
- `/api/parse-proposal-debug` - Debug version with detailed logging
- `/api/test-openai` - Tests OpenAI API connection
- `/api/errors/report` - Error reporting system
- `/api/logs` - Centralized logging endpoint

### Main Components
- `/components/po-builder.tsx` - Primary UI for PO creation and PDF upload
- `/components/purchase-order-form.tsx` - Form handling for PO data
- `/components/line-items-table.tsx` - Dynamic service line items
- `/store/purchase-order.ts` - Zustand store with auto-save functionality
- `/lib/db.ts` - Dexie database for draft persistence

### Data Flow
1. User uploads PDF via `POBuilder` component
2. PDF sent to `/api/parse-proposal-openai` 
3. OpenAI extracts structured data from PDF content
4. Data populates form fields in `PurchaseOrderForm`
5. User edits/reviews extracted data
6. Zustand store auto-saves drafts every 10 seconds
7. Generate PO button calls `/api/generate-po` to create final PDF

## Current Issues & Debugging

### Active Problems
- **PDF Parsing Error**: "Unexpected end of JSON input" error when parsing proposals
- **Vercel Auth**: API routes may require authentication on Vercel platform
- Debug endpoints created but need proper error visibility

### Known Working
- OpenAI API connection confirmed functional (`/api/test-openai`)
- PDF text extraction works with test endpoints
- Build and deployment process functional
- Auto-save and draft persistence working

### Debugging Tools
- `/api/parse-proposal-debug/route.ts` - Enhanced logging for PDF parsing
- `/lib/error-reporter.ts` - Centralized error reporting
- `/app/logs` - Error log viewing interface

## Development Guidelines

### File Modifications
- Check existing patterns in neighboring files before making changes
- Follow the established component structure in `/components/ui`
- Use the design system variables from `tailwind.config.ts`
- Maintain TypeScript strict mode compliance

### State Management
- Use Zustand store for global state (`/store/purchase-order.ts`)
- Implement auto-save for user data (10-second intervals)
- Use Dexie for persistent client-side storage

### Error Handling
- All API routes should use consistent error response format
- Log errors to `/api/errors/report` for debugging
- Provide user-friendly error messages via toast notifications

## User Preferences
- Wants simple, working solutions without over-engineering
- Expects proactive error checking and visibility
- Values clear feedback on deployment status
- Frustrated by repeated failures - test thoroughly before pushing