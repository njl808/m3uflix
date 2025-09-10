# Overview

This is a full-stack IPTV player application built with React and Express that allows users to connect to Xtream Codes providers to stream live TV, movies, and series. The application features a Netflix-style interface with content browsing, video playback, favorites management, and EPG (Electronic Program Guide) support.

# User Preferences

Preferred communication style: Simple, everyday language.

# System Architecture

## Frontend Architecture
- **Framework**: React with TypeScript using Vite as the build tool
- **Routing**: Wouter for client-side routing
- **State Management**: TanStack Query for server state management and caching
- **UI Components**: shadcn/ui component library built on Radix UI primitives
- **Styling**: Tailwind CSS with custom CSS variables for theming
- **Component Structure**: Modular components organized by feature (navigation, content grids, video player, modals)

## Backend Architecture
- **Framework**: Express.js with TypeScript
- **Development**: Hot reload using Vite middleware in development mode
- **Storage Interface**: Abstracted storage layer with in-memory implementation for user data
- **API Structure**: RESTful endpoints under `/api` prefix
- **Build Process**: ESBuild for production bundling with platform-specific optimizations

## Data Storage Solutions
- **Database**: PostgreSQL with Drizzle ORM for schema management and migrations
- **Connection**: Neon Database serverless driver for PostgreSQL connectivity
- **Schema**: User authentication schema with username/password fields
- **Session Management**: PostgreSQL-backed sessions using connect-pg-simple
- **Fallback Storage**: In-memory storage implementation for development/testing

## Authentication and Authorization
- **User Management**: Username/password authentication system
- **Session Storage**: Server-side sessions stored in PostgreSQL
- **Schema Validation**: Zod schemas for type-safe data validation
- **Security**: Session-based authentication with secure cookie handling

## External Service Integrations
- **Xtream Codes API**: Primary integration for IPTV content delivery
- **Content Types**: Support for live TV streams, VOD movies, and TV series
- **EPG Integration**: Electronic Program Guide data fetching and display
- **Stream Management**: Dynamic stream URL generation and content metadata handling
- **Category Management**: Hierarchical content organization by provider categories

## Key Design Patterns
- **Component Composition**: Reusable UI components with consistent prop interfaces
- **Custom Hooks**: Encapsulated API logic and state management (useXtreamAPI, useFavorites)
- **Error Handling**: Comprehensive error boundaries and user-friendly error messages
- **Responsive Design**: Mobile-first approach with adaptive layouts
- **Configuration Management**: Local storage for user settings and provider credentials
- **Type Safety**: Full TypeScript implementation with strict type checking