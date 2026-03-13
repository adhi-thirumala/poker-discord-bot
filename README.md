# Poker Discord Bot

A Discord bot for managing poker sessions, tracking buy-ins, cash-outs, and player statistics. Built with [discord-hono](https://discord-hono.luis.fun/) and deployed on Cloudflare Workers.

## Features

- 🎲 Manage poker sessions with fixed or variable buy-ins
- 💰 Track buy-ins, rebuys, and cash-outs
- 📊 Player statistics and leaderboards
- 📜 Session history
- 🔒 Role-based permissions for session management

## Prerequisites

- [Bun](https://bun.sh/) installed
- A Discord application/bot (create one at [Discord Developer Portal](https://discord.com/developers/applications))
- A Cloudflare account (for deployment)

## Setup

### 1. Clone and Install

```bash
git clone <your-repo-url>
cd poker-discord-bot
bun install
```

### 2. Configure Environment Variables

Create a `.env` file in the project root:

```env
DISCORD_APPLICATION_ID=your_application_id
DISCORD_TOKEN=your_bot_token
DISCORD_TEST_GUILD_ID=your_test_server_id
```

**Getting these values:**

- **DISCORD_APPLICATION_ID**: Discord Developer Portal → Your Application → General Information → Application ID
- **DISCORD_TOKEN**: Discord Developer Portal → Your Application → Bot → Reset Token
- **DISCORD_TEST_GUILD_ID** (optional): Right-click your Discord server → Copy Server ID (requires Developer Mode enabled)

### 3. Register Slash Commands

Register commands to Discord:

```bash
bun run register
```

**Note:** If you included `DISCORD_TEST_GUILD_ID`, commands will register instantly to that server. Without it, commands register globally but may take up to 1 hour to appear.

### 4. Set Up Cloudflare Resources

#### Create D1 Database

```bash
npx wrangler d1 create poker-discord-bot-db
```

Copy the database ID and update `wrangler.jsonc` with your database ID.

#### Create KV Namespace

```bash
npx wrangler kv namespace create POKER_KV
```

Copy the namespace ID and update `wrangler.jsonc` with your KV namespace ID.

#### Run Migrations

```bash
npx wrangler d1 execute poker-discord-bot-db --remote --file=./schema.sql
```

### 5. Configure Discord Bot

In the Discord Developer Portal:

1. Go to your application → Bot
2. Enable these **Privileged Gateway Intents** (if needed):
   - Server Members Intent (if you want to fetch member info)
3. Go to OAuth2 → URL Generator
4. Select scopes: `bot`, `applications.commands`
5. Select bot permissions: `Send Messages`, `Use Slash Commands`
6. Use the generated URL to invite the bot to your server

## Development

### Local Development

```bash
bun run dev
```

This starts a local Cloudflare Workers development server with hot reloading.

### Type Checking

```bash
bun run typecheck
```

### Generate Cloudflare Types

After changing bindings in `wrangler.jsonc`:

```bash
bun run cf-typegen
```

### Testing

```bash
bun test
```

## Deployment

### Set Secrets

Set your Discord credentials as Cloudflare secrets:

```bash
npx wrangler secret put DISCORD_APPLICATION_ID
npx wrangler secret put DISCORD_PUBLIC_KEY
npx wrangler secret put DISCORD_TOKEN
```

### Deploy to Cloudflare

```bash
bun run deploy
```

Your bot will be deployed to Cloudflare Workers!

### Configure Interactions Endpoint

After deployment:

1. Copy your Worker URL (shown after deployment)
2. Go to Discord Developer Portal → Your Application → General Information
3. Set **Interactions Endpoint URL** to: `https://your-worker-url.workers.dev/`
4. Discord will verify the endpoint

## Commands

- `/config set-host-role <role>` - Set the role that can manage poker sessions
- `/config view` - View current server configuration
- `/session start [fixed_buyin]` - Start a new poker session
- `/session end <session>` - End a poker session
- `/session view [session]` - View active session(s)
- `/buyin <session> [amount]` - Join a poker session
- `/rebuy <session> <amount>` - Rebuy into a session
- `/cashout <session> <amount>` - Cash out of a session
- `/leaderboard` - View the poker leaderboard
- `/profile [user]` - View player statistics
- `/history [session]` - View session history

## Project Structure

```
poker-discord-bot/
├── src/
│   ├── commands/       # Command handlers
│   ├── embeds/         # Discord embed builders
│   ├── db/             # Database queries and stats
│   ├── utils/          # Utility functions
│   ├── index.ts        # Main worker entry point
│   ├── register.ts     # Command registration script
│   └── types.ts        # TypeScript types
├── test/               # Test files
├── wrangler.jsonc      # Cloudflare Workers config
└── package.json
```

## Tech Stack

- **Runtime**: Cloudflare Workers (with Node.js compatibility)
- **Framework**: [discord-hono](https://discord-hono.luis.fun/)
- **Database**: Cloudflare D1 (SQLite)
- **Cache**: Cloudflare KV
- **Language**: TypeScript
- **Package Manager**: Bun

## License

MIT
