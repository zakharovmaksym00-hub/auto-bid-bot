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

async function waitForCaptcha(page, maxWaitTime = 120000) {
  console.log('\n⚠️  CAPTCHA DETECTED!');
  console.log('📍 Please solve the CAPTCHA manually in the browser window.');
  console.log('⏳ Waiting up to 2 minutes for CAPTCHA to be solved...\n');
  
  try {
    const startTime = Date.now();
    
    while (Date.now() - startTime < maxWaitTime) {
      const captchaVisible = await page.evaluate(() => {
        const captchaFrames = document.querySelectorAll('iframe[src*="captcha"], iframe[src*="recaptcha"]');
        return captchaFrames.length > 0;
      });
      
      if (!captchaVisible) {
        console.log('✓ CAPTCHA solved! Continuing...\n');
        return true;
      }
      
      const loggedIn = await page.evaluate(() => {
        return document.body.textContent.includes('Dashboard') 
          || document.body.textContent.includes('My Projects')
          || !!document.querySelector('a[href*="/profile"]');
      });
      
      if (loggedIn) {
        console.log('✓ Login successful! Continuing...\n');
        return true;
      }
      
      await page.waitForTimeout(2000);
    }
    
    console.log('❌ CAPTCHA timeout - took too long to solve');
    return false;
  } catch (error) {
    console.error('Error waiting for CAPTCHA:', error.message);
    return false;
  }
}

async function loginToFreelancer(page) {
  try {
    console.log('📍 Navigating to Freelancer.com...');
    await page.goto('https://www.freelancer.com/', { 
      waitUntil: 'domcontentloaded',
      timeout: 60000 
    });
    
    await page.waitForTimeout(3000);
    
    console.log('📍 Looking for login button...');
    
    const loginBtn = await page.$('a[href*="/login"]') 
      || await page.$('[data-test="login-button"]')
      || await page.$('button:has-text("Log In")')
      || await page.$('a:has-text("Log In")');
    
    if (!loginBtn) {
      console.log('⚠️  Login button not found, trying alternative method...');
      await page.evaluate(() => {
        const links = Array.from(document.querySelectorAll('a'));
        const loginLink = links.find(link => link.textContent.includes('Log In'));
        if (loginLink) loginLink.click();
      });
    } else {
      await loginBtn.click();
    }
    
    console.log('📍 Waiting for login page to load...');
    await page.waitForTimeout(3000);
    
    console.log('📍 Filling email...');
    const emailInput = await page.$('input[type="email"]') 
      || await page.$('input[name*="email"]')
      || await page.$('input[placeholder*="email"]');
    
    if (!emailInput) {
      console.log('❌ Email input not found');
      return false;
    }
    
    await emailInput.type(FREELANCER_EMAIL, { delay: 50 });
    await page.waitForTimeout(1000);
    
    console.log('📍 Filling password...');
    const passwordInput = await page.$('input[type="password"]') 
      || await page.$('input[name*="password"]');
    
    if (!passwordInput) {
      console.log('❌ Password input not found');
      return false;
    }
    
    await passwordInput.type(FREELANCER_PASSWORD, { delay: 50 });
    await page.waitForTimeout(1000);
    
    console.log('📍 Clicking submit button...');
    const submitBtn = await page.$('button[type="submit"]') 
      || await page.$('button:has-text("Log In")')
      || await page.$('button:has-text("Sign In")');
    
    if (!submitBtn) {
      console.log('❌ Submit button not found');
      return false;
    }
    
    await submitBtn.click();
    await page.waitForTimeout(3000);
    
    const hasCaptcha = await page.evaluate(() => {
      const captchaFrames = document.querySelectorAll('iframe[src*="captcha"], iframe[src*="recaptcha"]');
      const captchaText = document.body.textContent.toLowerCase().includes('captcha') 
        || document.body.textContent.toLowerCase().includes('verify');
      return captchaFrames.length > 0 || captchaText;
    });
    
    if (hasCaptcha) {
      const captchaSolved = await waitForCaptcha(page);
      if (!captchaSolved) {
        return false;
      }
    }
    
    try {
      await page.waitForNavigation({ 
        waitUntil: 'domcontentloaded',
        timeout: 10000 
      });
    } catch (e) {
      console.log('⚠️  No navigation detected, checking login status...');
    }
    
    await page.waitForTimeout(3000);
    
    const isLoggedIn = await page.evaluate(() => {
      return document.body.textContent.includes('Dashboard') 
        || document.body.textContent.includes('My Projects')
        || document.body.textContent.includes('My Bids')
        || !!document.querySelector('a[href*="/profile"]')
        || !!document.querySelector('[data-test="user-menu"]');
    });
    
    if (isLoggedIn) {
      console.log('✓ Logged in successfully');
      return true;
    } else {
      console.log('⚠️  Login status unclear - proceeding anyway...');
      return true;
    }
  } catch (error) {
    console.error('✗ Login failed:', error.message);
    return false;
  }
}

async function checkFor404(page) {
  try {
    const is404 = await page.evaluate(() => {
      const pageText = document.body.textContent.toLowerCase();
      const pageTitle = document.title.toLowerCase();
      return pageText.includes('404') 
        || pageText.includes('not found') 
        || pageTitle.includes('404')
        || pageTitle.includes('not found');
    });
    return is404;
  } catch (error) {
    return false;
  }
}

async function searchProjects(page, keywords) {
  try {
    const urlPatterns = [
      `https://www.freelancer.com/projects?q=${encodeURIComponent(keywords)}`,
      `https://www.freelancer.com/projects/search?q=${encodeURIComponent(keywords)}`,
      `https://www.freelancer.com/projects/search/?q=${encodeURIComponent(keywords)}`,
      `https://www.freelancer.com/search/projects/?q=${encodeURIComponent(keywords)}`
    ];
    
    for (const url of urlPatterns) {
      console.log(`📍 Trying URL: ${url}`);
      
      try {
        await page.goto(url, { 
          waitUntil: 'domcontentloaded',
          timeout: 60000 
        });
        
        await page.waitForTimeout(3000);
        
        const is404 = await checkFor404(page);
        
        if (!is404) {
          console.log(`✓ Successfully loaded search page`);
          console.log(`✓ Searching for: ${keywords}`);
          return true;
        } else {
          console.log(`⚠️  Got 404 error, trying next URL...`);
        }
      } catch (error) {
        console.log(`⚠️  Failed to load ${url}: ${error.message}`);
      }
    }
    
    console.error('❌ All search URLs failed');
    return false;
  } catch (error) {
    console.error('✗ Search failed:', error.message);
    return false;
  }
}

async function getProjectDetails(page, projectElement) {
  try {
    const projectData = await projectElement.evaluate(el => {
      const titleEl = el.querySelector('[data-test="project-card-title"]') 
        || el.querySelector('h2') 
        || el.querySelector('.project-title')
        || el.querySelector('a[href*="/projects/"]');
      
      const budgetEl = el.querySelector('[data-test="budget"]') 
        || el.querySelector('.budget')
        || el.querySelector('[class*="budget"]');
      
      const descEl = el.querySelector('[data-test="project-description"]') 
        || el.querySelector('.description')
        || el.querySelector('[class*="description"]');
      
      const skillsEl = el.querySelector('[data-test="skills"]') 
        || el.querySelector('.skills')
        || el.querySelector('[class*="skills"]');
      
      const linkEl = el.querySelector('a[href*="/projects/"]');
      
      return {
        title: titleEl ? titleEl.textContent.trim().substring(0, 100) : '',
        budget: budgetEl ? budgetEl.textContent.trim() : '',
        description: descEl ? descEl.textContent.trim().substring(0, 200) : '',
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
    console.log(`📍 Opening project: ${projectUrl}`);
    await page.goto(projectUrl, { 
      waitUntil: 'domcontentloaded',
      timeout: 60000 
    });
    
    await page.waitForTimeout(2000);
    
    const is404 = await checkFor404(page);
    if (is404) {
      console.log('⚠️  Project page returned 404 - project may have expired');
      return false;
    }
    
    const projectInfo = await page.evaluate(() => {
      const title = document.querySelector('h1') ? document.querySelector('h1').textContent.trim() : '';
      const description = document.querySelector('[data-test="project-description"]') 
        ? document.querySelector('[data-test="project-description"]').textContent.trim() 
        : document.body.textContent.substring(0, 500);
      return { title, description };
    });
    
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
    
    const bidBtn = await page.$('[data-test="bid-button"]') 
      || await page.$('button:has-text("Bid")')
      || await page.$('button[class*="bid"]');
    
    if (!bidBtn) {
      console.log('⚠️  Bid button not found - project may not allow bidding');
      return false;
    }
    
    await bidBtn.click();
    await page.waitForTimeout(2000);
    
    const bidInput = await page.$('input[type="number"]') 
      || await page.$('input[name*="bid"]')
      || await page.$('input[placeholder*="amount"]');
    
    if (bidInput) {
      await bidInput.click({ clickCount: 3 });
      await bidInput.type(bidAmount.toString(), { delay: 50 });
    }
    
    const messageInput = await page.$('textarea') 
      || await page.$('textarea[name*="message"]')
      || await page.$('div[contenteditable="true"]');
    
    if (messageInput) {
      await messageInput.click();
      await messageInput.type(bidMessage, { delay: 10 });
    }
    
    await page.waitForTimeout(1000);
    
    const submitBtn = await page.$('button[type="submit"]') 
      || await page.$('button:has-text("Place Bid")')
      || await page.$('button:has-text("Submit")');
    
    if (submitBtn) {
      await submitBtn.click();
      await page.waitForTimeout(2000);
      console.log(`✓ Bid placed: $${bidAmount}`);
      return true;
    }
    
    return false;
  } catch (error) {
    console.error(`✗ Failed to place bid: ${error.message}`);
    return false;
  }
}

async function runBot() {
  let browser;
  
  try {
    console.log('🚀 Starting Freelancer Auto Bid Bot...\n');
    
    browser = await puppeteer.launch({
      headless: HEADLESS_MODE,
      args: ['--no-sandbox', '--disable-setuid-sandbox', '--disable-dev-shm-usage']
    });
    
    const page = await browser.newPage();
    await page.setViewport({ width: 1280, height: 720 });
    
    page.setDefaultNavigationTimeout(60000);
    page.setDefaultTimeout(60000);
    
    const loggedIn = await loginToFreelancer(page);
    if (!loggedIn) {
      console.error('\n❌ Failed to login. Please check:');
      console.error('   1. Your email and password in .env file');
      console.error('   2. Your internet connection');
      console.error('   3. If Freelancer website is accessible');
      return;
    }
    
    const searchKeywords = process.env.SEARCH_KEYWORDS || 'nodejs';
    const searched = await searchProjects(page, searchKeywords);
    if (!searched) {
      console.error('\n❌ Failed to search for projects');
      console.error('   Freelancer.com URL structure may have changed');
      console.error('   Try visiting https://www.freelancer.com manually and check the search URL');
      return;
    }
    
    await page.waitForTimeout(3000);
    
    const projectElements = await page.$$('[data-test="project-card"]') 
      || await page.$$('div[class*="project-card"]')
      || await page.$$('a[href*="/projects/"]');
    
    console.log(`\n🔍 Found ${projectElements.length} projects\n`);
    
    if (projectElements.length === 0) {
      console.log('⚠️  No projects found. The website structure may have changed.');
      console.log('   Try visiting https://www.freelancer.com/projects manually to check.');
      return;
    }
    
    let bidsPlaced = 0;
    let bidsSkipped = 0;
    
    for (let i = 0; i < Math.min(projectElements.length, MAX_PROJECTS_TO_BID); i++) {
      try {
        const projectElement = projectElements[i];
        const projectData = await getProjectDetails(projectElement);
        
        if (!projectData || !projectData.url) {
          bidsSkipped++;
          continue;
        }
        
        console.log(`\n📋 Project ${i + 1}: ${projectData.title || 'Untitled'}`);
        if (projectData.budget) console.log(`   Budget: ${projectData.budget}`);
        if (projectData.skills) console.log(`   Skills: ${projectData.skills}`);
        
        const isQualified = taskFilter.filterTask(projectData);
        
        if (!isQualified) {
          console.log('✗ Project filtered out - does not match criteria');
          bidsSkipped++;
          continue;
        }
        
        const success = await placeBid(page, projectData.url, BID_AMOUNT);
        
        if (success) {
          bidsPlaced++;
        } else {
          bidsSkipped++;
        }
        
        if (i < projectElements.length - 1) {
          console.log(`⏳ Waiting ${DELAY_BETWEEN_BIDS}ms before next bid...`);
          await page.waitForTimeout(DELAY_BETWEEN_BIDS);
        }
      } catch (error) {
        console.error(`⚠️  Error processing project ${i + 1}:`, error.message);
        bidsSkipped++;
      }
    }
    
    console.log(`\n✓ Bot completed!`);
    console.log(`   Bids placed: ${bidsPlaced}`);
    console.log(`   Bids skipped: ${bidsSkipped}`);
    
  } catch (error) {
    console.error('\n✗ Critical error:', error.message);
  } finally {
    if (browser) {
      await browser.close();
    }
  }
}

runBot();
