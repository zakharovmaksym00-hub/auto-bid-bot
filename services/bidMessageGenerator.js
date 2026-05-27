const axios = require('axios');
require('dotenv').config();

class BidMessageGenerator {
  constructor() {
    this.apiKey = process.env.OPENAI_API_KEY;
    this.model = process.env.OPENAI_MODEL || 'gpt-3.5-turbo';
    this.temperature = parseFloat(process.env.OPENAI_TEMPERATURE || '0.7');
    this.apiUrl = 'https://api.openai.com/v1/chat/completions';
    
    if (!this.apiKey) {
      console.warn('⚠️  OPENAI_API_KEY not set in .env file');
    }
  }

  async generateBidMessage(projectInfo) {
    try {
      if (!this.apiKey) {
        return this.getDefaultBidMessage(projectInfo);
      }

      const prompt = `You are a professional freelancer bidding on a project. 
      
Project Title: ${projectInfo.projectTitle}
Project Description: ${projectInfo.projectDescription}
Proposed Bid: $${projectInfo.bidAmount}

Write a professional, concise bid message (2-3 sentences) that:
1. Shows understanding of the project
2. Highlights relevant experience
3. Demonstrates professionalism
4. Is personalized to this specific project

Return ONLY the bid message, nothing else.`;

      const response = await axios.post(this.apiUrl, {
        model: this.model,
        messages: [
          {
            role: 'user',
            content: prompt
          }
        ],
        temperature: this.temperature,
        max_tokens: 200
      }, {
        headers: {
          'Authorization': `Bearer ${this.apiKey}`,
          'Content-Type': 'application/json'
        },
        timeout: 10000
      });

      const bidMessage = response.data.choices[0].message.content.trim();
      return bidMessage;
    } catch (error) {
      console.error('✗ Error calling OpenAI API:', error.message);
      return this.getDefaultBidMessage(projectInfo);
    }
  }

  getDefaultBidMessage(projectInfo) {
    const messages = [
      `I'm interested in your project "${projectInfo.projectTitle}". I have extensive experience in this field and can deliver high-quality results. My bid is $${projectInfo.bidAmount}.`,
      `Hello! I can help you with this project. I have the skills and experience needed to deliver excellent results for your budget of $${projectInfo.bidAmount}.`,
      `I'm confident I can complete this project successfully. With my expertise, I can deliver quality work within your budget. Looking forward to discussing this further.`
    ];
    return messages[Math.floor(Math.random() * messages.length)];
  }
}

module.exports = BidMessageGenerator;