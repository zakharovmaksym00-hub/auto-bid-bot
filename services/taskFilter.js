require('dotenv').config();

class TaskFilter {
  constructor() {
    // Parse skills from env
    this.requiredSkills = (process.env.SKILLS || 'nodejs,javascript')
      .split(',')
      .map(s => s.trim().toLowerCase());
    
    // Parse keywords from env
    this.keywords = (process.env.KEYWORDS || 'web development')
      .split(',')
      .map(k => k.trim().toLowerCase());
    
    // Parse excluded keywords from env
    this.excludedKeywords = (process.env.EXCLUDED_KEYWORDS || '')
      .split(',')
      .map(k => k.trim().toLowerCase())
      .filter(k => k.length > 0);
    
    // Budget filters
    this.minBudget = parseFloat(process.env.MIN_PROJECT_BUDGET || '100');
    this.maxBudget = parseFloat(process.env.MAX_PROJECT_BUDGET || '5000');
  }

  filterTask(projectData) {
    // Check for excluded keywords first
    if (this.hasExcludedKeywords(projectData)) {
      if (process.env.DEBUG === 'true') {
        console.log('   ✗ Contains excluded keywords');
      }
      return false;
    }

    // Check budget
    if (!this.isBudgetInRange(projectData.budget)) {
      if (process.env.DEBUG === 'true') {
        console.log('   ✗ Budget out of range');
      }
      return false;
    }

    // Check for required skills
    if (!this.hasRequiredSkills(projectData)) {
      if (process.env.DEBUG === 'true') {
        console.log('   ✗ Missing required skills');
      }
      return false;
    }

    // Check for keywords match
    if (!this.hasMatchingKeywords(projectData)) {
      if (process.env.DEBUG === 'true') {
        console.log('   ✗ No matching keywords');
      }
      return false;
    }

    if (process.env.DEBUG === 'true') {
      console.log('   ✓ Passed all filters');
    }
    return true;
  }

  hasExcludedKeywords(projectData) {
    const text = `${projectData.title} ${projectData.description} ${projectData.skills}`
      .toLowerCase();
    
    return this.excludedKeywords.some(keyword => text.includes(keyword));
  }

  isBudgetInRange(budgetText) {
    if (!budgetText) return false;
    
    // Extract numbers from budget text (e.g., "$100-$500", "$1000")
    const numbers = budgetText.match(/\d+/g);
    if (!numbers || numbers.length === 0) return false;
    
    const budget = parseFloat(numbers[0]);
    return budget >= this.minBudget && budget <= this.maxBudget;
  }

  hasRequiredSkills(projectData) {
    const projectText = `${projectData.skills} ${projectData.title} ${projectData.description}`
      .toLowerCase();
    
    // Check if at least one required skill is mentioned
    return this.requiredSkills.some(skill => projectText.includes(skill));
  }

  hasMatchingKeywords(projectData) {
    const projectText = `${projectData.title} ${projectData.description}`
      .toLowerCase();
    
    // Check if at least one keyword is mentioned
    return this.keywords.some(keyword => projectText.includes(keyword));
  }
}

module.exports = TaskFilter;