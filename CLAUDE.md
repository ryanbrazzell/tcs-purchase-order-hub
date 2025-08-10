# CRITICAL REQUIREMENTS - MUST FOLLOW

## 1. ALWAYS CHECK VERCEL DEPLOYMENT AFTER GIT PUSH

**MANDATORY**: After EVERY `git push` command, you MUST:

1. Wait 45-60 seconds for deployment
2. Run `vercel ls | head -5` to get latest deployment URL
3. Check build status with: `vercel inspect --logs <deployment-url> | tail -20 | grep -E "(error|Error|failed|Failed)"`
4. Confirm deployment succeeded before responding to user

**NEVER** skip this step. The user has explicitly requested this and it's critical for debugging.

## 2. Current Issues

### PDF Parsing Error
- User reports "Unexpected end of JSON input" error
- Debug endpoint created at `/api/parse-proposal-debug`
- Error reporting system created but Vercel requires auth for API routes
- Test endpoint `/api/test-openai` confirms OpenAI is working

### Known Working
- OpenAI API connection is functioning
- PDF text extraction works (tested with test endpoints)
- Build and deployment process works

## 3. Project Context

This is a TCS Purchase Order Hub that:
- Extracts data from customer proposal PDFs
- Uses OpenAI to intelligently parse and structure the data
- Allows editing before generating final purchase orders

## 4. Key Files
- `/app/api/parse-proposal-debug/route.ts` - Debug version with detailed logging
- `/components/po-builder.tsx` - Main UI component
- `/lib/error-reporter.ts` - Error reporting system
- `/app/api/test-openai/route.ts` - OpenAI connection test

## 5. User Preferences
- Wants simple, working solutions
- Frustrated by repeated failures
- Expects proactive error checking
- Wants you to see errors without manual intervention