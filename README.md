# Auto Bid Bot 🤖

Advanced automated bidding bot for Freelancer.com with ChatGPT integration for intelligent bid messages.

## Features ✨

- ✅ **Automated Login** - Auto-login to Freelancer.com
- ✅ **Smart Filtering** - Filter projects by skills, keywords, budget
- ✅ **ChatGPT Integration** - AI-powered personalized bid messages
- ✅ **AI Server** - Standalone server to generate bid messages
- ✅ **Batch Processing** - Generate multiple bid messages at once
- ✅ **Customizable Config** - Control all behavior via .env file
- ✅ **Automatic Bidding** - Place bids on matching projects

## ���️ Important Warning

**This tool automates Freelancer.com interactions which may violate their Terms of Service.**

- Your account could be suspended or permanently banned
- Use at your own risk
- Be responsible and ethical in your automation

## Prerequisites

- Node.js 14+ installed
- npm or yarn
- Valid Freelancer.com account
- OpenAI API key (optional, for ChatGPT features)
- Chrome/Chromium browser installed

## Installation

### 1. Clone Repository
```bash
git clone https://github.com/zakharovmaksym00-hub/auto-bid-bot.git
cd auto-bid-bot
```

### 2. Install Dependencies
```bash
npm install
```

### 3. Configure Environment
```bash
cp .env.example .env
```

Edit `.env` and fill in your details:

```env
# Freelancer Credentials
FREELANCER_EMAIL=your_email@gmail.com
FREELANCER_PASSWORD=your_password

# OpenAI API (for ChatGPT integration)
OPENAI_API_KEY=sk-your-key-here
OPENAI_MODEL=gpt-3.5-turbo

# Skills Filter
SKILLS=nodejs,javascript,react,express

# Keywords Filter
KEYWORDS=web development,full stack,api
EXCLUDED_KEYWORDS=urgent,asap,php

# Budget Range
MIN_PROJECT_BUDGET=100
MAX_PROJECT_BUDGET=5000

# Bot Settings
BID_AMOUNT=50
SEARCH_KEYWORDS=nodejs,javascript
MAX_PROJECTS_TO_BID=10
DELAY_BETWEEN_BIDS=3000
HEADLESS_MODE=true
```

## Usage

### Option 1: Run Main Bot
```bash
npm start
```

This will:
1. Login to Freelancer
2. Search for projects
3. Filter projects based on your criteria
4. Generate AI bid messages
5. Place bids on matching projects

### Option 2: Run AI Server Only
```bash
npm run start-ai-server
```

The server will run on `http://localhost:3001` and provide API endpoints for generating bid messages.

#### Generate Single Bid Message
```bash
curl -X POST http://localhost:3001/api/generate-bid-message \
  -H "Content-Type: application/json" \
  -d '{
    "projectTitle": "Build a Node.js API",
    "projectDescription": "Need a RESTful API with MongoDB",
    "bidAmount": 500
  }'
```

#### Generate Multiple Bid Messages
```bash
curl -X POST http://localhost:3001/api/batch-generate \
  -H "Content-Type: application/json" \
  -d '{
    "projects": [
      {
        "title": "Project 1",
        "description": "Description 1",
        "bidAmount": 100
      },
      {
        "title": "Project 2",
        "description": "Description 2",
        "bidAmount": 200
      }
    ]
  }'
```

### Option 3: Development Mode

```bash
# Run bot in development mode (auto-reload on changes)
npm run dev

# Run AI server in development mode
npm run dev-ai-server

# Run both simultaneously
npm run dev-all
```

## Configuration Guide

### Skills Filter
List the programming skills/technologies you offer:
```env
SKILLS=nodejs,javascript,react,express,mongodb,python
```

### Keywords Filter
Projects must contain at least one of these keywords:
```env
KEYWORDS=web development,full stack,api,backend,frontend
```

### Excluded Keywords
Projects containing these keywords will be skipped:
```env
EXCLUDED_KEYWORDS=urgent,asap,spam,php,java
```

### Budget Range
Only bid on projects within this budget range:
```env
MIN_PROJECT_BUDGET=100
MAX_PROJECT_BUDGET=5000
```

## Project Structure

```
auto-bid-bot/
├── index.js                    # Main bot script
├── ai-server.js               # Standalone AI server
├── services/
│   ├── bidMessageGenerator.js # ChatGPT integration
│   └── taskFilter.js          # Project filtering logic
├── .env.example               # Environment template
├── package.json               # Dependencies
└── README.md                  # This file
```

## How It Works

### 1. Bot Flow
```
Login → Search Projects → Get Project Details → 
Filter Projects → Generate AI Bid Message → Place Bid
```

### 2. Filtering Logic
```
Project Data
    ↓
Check Excluded Keywords → Check Budget → Check Skills → Check Keywords
    ↓
Decision (Bid or Skip)
```

### 3. AI Bid Generation
```
Project Details → ChatGPT Prompt → AI Response → Personalized Bid Message
```

## API Endpoints (AI Server)

### GET /health
Check if server is running
```bash
curl http://localhost:3001/health
```

### POST /api/generate-bid-message
Generate a single bid message

**Body:**
```json
{
  "projectTitle": "Build a Node.js API",
  "projectDescription": "Need a RESTful API with MongoDB database",
  "bidAmount": 500
}
```

**Response:**
```json
{
  "success": true,
  "bidMessage": "I have extensive experience building RESTful APIs with Node.js and MongoDB...",
  "timestamp": "2024-05-27T10:30:00.000Z"
}
```

### POST /api/batch-generate
Generate multiple bid messages at once

**Body:**
```json
{
  "projects": [
    {
      "title": "Project 1",
      "description": "Description 1",
      "bidAmount": 100
    }
  ]
}
```

## Troubleshooting

### Login Issues
- Verify email and password in .env
- Check if Freelancer website has changed
- May need to update selectors if Freelancer updates their UI

### ChatGPT Not Working
- Check if `OPENAI_API_KEY` is set correctly
- Verify API key has sufficient credits
- Check internet connection
- Bot will use default messages if API fails

### No Projects Found
- Check `SEARCH_KEYWORDS`
- Verify filters aren't too restrictive
- Check Freelancer website for available projects

### Bidding Fails
- Website structure may have changed
- Selectors need to be updated
- Check browser console for errors (set `HEADLESS_MODE=false` to see)

## Security Notes

⚠️ **Never:**
- Commit `.env` file with real credentials
- Share your OpenAI API key
- Push your credentials to GitHub
- Use on shared computers

✅ **Always:**
- Use `.gitignore` for sensitive files
- Rotate API keys regularly
- Monitor API usage and costs
- Test with `HEADLESS_MODE=false` first

## Ethical Considerations

Before using this bot:
- Review Freelancer's Terms of Service
- Ensure your bids are genuine and competitive
- Don't spam projects with generic messages
- Respect rate limits and don't overload the site
- Consider the impact on genuine freelancers

## Support & Issues

If you encounter issues:
1. Check the troubleshooting section
2. Set `DEBUG=true` in .env for verbose logging
3. Review Freelancer website for structure changes
4. Test individual functions separately

## License

MIT License - Use at your own risk

## Disclaimer

**This tool is provided "as-is" for educational purposes only.**

The author is not responsible for:
- Account bans or suspensions
- Service disruptions
- Financial losses
- Any other consequences of using this tool

**Use responsibly and ethically.**
