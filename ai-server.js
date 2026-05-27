const express = require('express');
const BidMessageGenerator = require('./services/bidMessageGenerator');
require('dotenv').config();

const app = express();
const PORT = process.env.AI_SERVER_PORT || 3001;
const bidGenerator = new BidMessageGenerator();

// Middleware
app.use(express.json());

// Health check
app.get('/health', (req, res) => {
  res.json({ status: 'AI Server is running', timestamp: new Date() });
});

// Generate bid message endpoint
app.post('/api/generate-bid-message', async (req, res) => {
  try {
    const { projectTitle, projectDescription, bidAmount } = req.body;

    // Validate input
    if (!projectTitle || !projectDescription || !bidAmount) {
      return res.status(400).json({
        error: 'Missing required fields: projectTitle, projectDescription, bidAmount'
      });
    }

    console.log(`\n📝 Generating bid message for: "${projectTitle}"`);
    
    const bidMessage = await bidGenerator.generateBidMessage({
      projectTitle,
      projectDescription,
      bidAmount
    });

    res.json({
      success: true,
      bidMessage: bidMessage,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Batch generate bid messages
app.post('/api/batch-generate', async (req, res) => {
  try {
    const { projects } = req.body;

    if (!Array.isArray(projects) || projects.length === 0) {
      return res.status(400).json({
        error: 'Invalid input: expected array of projects'
      });
    }

    const results = [];
    
    for (const project of projects) {
      const bidMessage = await bidGenerator.generateBidMessage({
        projectTitle: project.title,
        projectDescription: project.description,
        bidAmount: project.bidAmount
      });
      
      results.push({
        projectTitle: project.title,
        bidMessage: bidMessage,
        bidAmount: project.bidAmount
      });
    }

    res.json({
      success: true,
      count: results.length,
      results: results,
      timestamp: new Date()
    });
  } catch (error) {
    console.error('Error:', error.message);
    res.status(500).json({
      success: false,
      error: error.message
    });
  }
});

// Start server
app.listen(PORT, () => {
  console.log(`\n🚀 AI Server running on http://localhost:${PORT}`);
  console.log(`   Health check: http://localhost:${PORT}/health`);
  console.log(`   Generate bid: POST http://localhost:${PORT}/api/generate-bid-message`);
  console.log(`   Batch generate: POST http://localhost:${PORT}/api/batch-generate`);
});

module.exports = app;