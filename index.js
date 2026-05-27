const puppeteer = require('puppeteer');
const BidMessageGenerator = require('./services/bidMessageGenerator');
const TaskFilter = require('./services/taskFilter');
require('dotenv').config();

const FREELANCER_EMAIL = process.env.FREELANCER_EMAIL;
const FREELANCER_PASSWORD = process.env.FREELANCER_PASSWORD;
const BID_AMOUNT = process.env.BID_AMOUNT || 50;
const MAX_PROJECTS_TO_BID = process.env.MAX_PROJECTS_TO_BID || 10;
const DELAY_BETWEEN_BIDS = process.env.DELAY_BETWEEN_BIDS || 3000;
const HEADLESS_MODE = process.env.HEADLESS_MODE === 'true' ? 'new' : false;

const bidGenerator = new BidMessageGenerator();
const taskFilter = new TaskFilter();

async function loginToFreelancer(page) {
  try {
    await page.goto('https://www.freelancer.com/', { waitUntil: 'networkidle2' });
    
    // Click login button
    const loginBtn = await page.$('[data-test="login-button"]') || await page.$('a[href="/login"]');
    if (loginBtn) await loginBtn.click();
    
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    
    // Fill email
    await page.type('[type="email"]', FREELANCER_EMAIL);
    
    // Fill password
    await page.type('[type="password"]', FREELANCER_PASSWORD);
    
    // Click login
    const submitBtn = await page.$('[type="submit"]');
    if (submitBtn) await submitBtn.click();
    
    await page.waitForNavigation({ waitUntil: 'networkidle2' });
    
    console.log('✓ Logged in successfully');
    return true;
  } catch (error) {
    console.error('✗ Login failed:', error.message);
    return false;
  }
}

async function searchProjects(page, keywords) {
  try {
    const searchUrl = `https://www.freelancer.com/projects/search/?q=${encodeURIComponent(keywords)}`;
    await page.goto(searchUrl, { waitUntil: 'networkidle2' });
    await page.waitForTimeout(2000);
    console.log(`✓ Searching for: ${keywords}`);
    return true;
  } catch (error) {
    console.error('✗ Search failed:', error.message);
    return false;
  }
}

async function getProjectDetails(page, projectElement) {
  try {
    const projectData = await projectElement.evaluate(el => {
      const titleEl = el.querySelector('[data-test="project-card-title"]') || el.querySelector('h2');
      const budgetEl = el.querySelector('[data-test="budget"]') || el.querySelector('.budget');
      const descEl = el.querySelector('[data-test="project-description"]') || el.querySelector('.description');
      const skillsEl = el.querySelector('[data-test="skills"]') || el.querySelector('.skills');
      const linkEl = el.querySelector('a[href*="/projects/"]');
      
      return {
        title: titleEl ? titleEl.textContent.trim() : '',
        budget: budgetEl ? budgetEl.textContent.trim() : '',
        description: descEl ? descEl.textContent.trim() : '',
        skills: skillsEl ? skillsEl.textContent.trim() : '',
        url: linkEl ? linkEl.href : '',
      };
    });
    return projectData;
  } catch (error) {
    console.error('✗ Failed to get project details:', error.message);
    return null;
  }
}

async function placeBid(page, projectUrl, bidAmount) {
  try {
    await page.goto(projectUrl, { waitUntil: 'networkidle2' });
    await page.waitForTimeout(2000);
    
    // Get project title and description
    const projectInfo = await page.evaluate(() => {
      const title = document.querySelector('h1') ? document.querySelector('h1').textContent.trim() : '';
      const description = document.querySelector('[data-test="project-description"]') ? 
        document.querySelector('[data-test="project-description"]').textContent.trim() : '';
      return { title, description };
    });
    
    // Generate AI-powered bid message
    console.log(`\n📝 Generating bid message using ChatGPT...`);
    const bidMessage = await bidGenerator.generateBidMessage({
      projectTitle: projectInfo.title,
      projectDescription: projectInfo.description,
      bidAmount: bidAmount
    });
    
    if (!bidMessage) {
      console.log('✗ Failed to generate bid message');
      return false;
    }
    
    console.log(`✓ Generated message: ${bidMessage.substring(0, 100)}...`);
    
    // Click bid button
    const bidBtn = await page.$('[data-test="bid-button"]') || await page.$('button:contains("Bid")');
    if (!bidBtn) {
      console.log('✗ Bid button not found');
      return false;
    }
    
    await bidBtn.click();
    await page.waitForTimeout(1500);
    
    // Fill bid amount
    const bidInput = await page.$('[name="bidAmount"]') || await page.$('input[type="number"]');
    if (bidInput) {
      await bidInput.click({ clickCount: 3 });
      await bidInput.type(bidAmount.toString());
    }
    
    // Fill message
    const messageInput = await page.$('[name="message"]') || await page.$('textarea');
    if (messageInput) {
      await messageInput.click();
      await messageInput.type(bidMessage);
    }
    
    // Submit bid
    const submitBtn = await page.$('[data-test="submit-bid"]') || await page.$('button[type="submit"]');
    if (submitBtn) {
      await submitBtn.click();
      await page.waitForTimeout(2000);
    }
    
    console.log(`✓ Bid placed: $${bidAmount}`);
    return true;
  } catch (error) {
    console.error(`✗ Failed to place bid: ${error.message}`);
    return false;
  }
}

async function runBot() {
  const browser = await puppeteer.launch({
    headless: HEADLESS_MODE,
    args: ['--no-sandbox', '--disable-setuid-sandbox']
  });
  
  let bidsPlaced = 0;
  let bidsSkipped = 0;
  
  try {
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    // Login
    const loggedIn = await loginToFreelancer(page);
    if (!loggedIn) {
      console.error('✗ Failed to login. Exiting...');
      return;
    }
    
    // Search for projects
    const searchKeywords = process.env.SEARCH_KEYWORDS || 'nodejs';
    await searchProjects(page, searchKeywords);
    
    // Get project links
    const projectElements = await page.$$('[data-test="project-card"]') || await page.$$('div[class*="project"]');
    
    console.log(`\n🔍 Found ${projectElements.length} projects`);
    
    // Filter and bid on projects
    for (let i = 0; i < Math.min(projectElements.length, MAX_PROJECTS_TO_BID); i++) {
      const projectElement = projectElements[i];
      const projectData = await getProjectDetails(projectElement);
      
      if (!projectData || !projectData.url) continue;
      
      console.log(`\n📋 Project ${i + 1}: ${projectData.title}`);
      console.log(`   Budget: ${projectData.budget}`);
      console.log(`   Skills: ${projectData.skills}`);
      
      // Filter project
      const isQualified = taskFilter.filterTask(projectData);
      
      if (!isQualified) {
        console.log('✗ Project filtered out - does not match criteria');
        bidsSkipped++;
        continue;
      }
      
      // Place bid
      const success = await placeBid(page, projectData.url, BID_AMOUNT);
      
      if (success) {
        bidsPlaced++;
      } else {
        bidsSkipped++;
      }
      
      // Wait between bids
      if (i < projectElements.length - 1) {
        await page.waitForTimeout(DELAY_BETWEEN_BIDS);
      }
    }
    
    console.log(`\n✓ Bot completed!`);
    console.log(`   Bids placed: ${bidsPlaced}`);
    console.log(`   Bids skipped: ${bidsSkipped}`);
  } catch (error) {
    console.error('✗ Error:', error);
  } finally {
    await browser.close();
  }
}

runBot();
