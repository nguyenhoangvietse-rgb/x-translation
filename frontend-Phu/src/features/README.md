# Features

This directory contains domain/feature-driven modules based on the database schema.

## Structure

Each feature folder contains:
- **components/** - React components specific to the feature
- **api/** - API routes and server actions
- **types/** - TypeScript interfaces and types
- **hooks/** - Custom React hooks

## Features

### 📚 novels
Manage novel metadata including title, author, description, and cover photos.

### 📤 uploads
Handle file uploads for novels with chapter range information.

### 📖 chapters
Manage individual chapters linked to novels.

## Usage

Import from feature folders:
```typescript
import { Novel } from '@/features/novels';
import { Upload } from '@/features/uploads';
import { Chapter } from '@/features/chapters';
```
