function safeNumber(value, fallback = 0) {
  const num = Number(value);
  return Number.isFinite(num) ? num : fallback;
}

function buildProfileScore(summary) {
  const academics = Math.min(100, 40 + safeNumber(summary.academicCount) * 5);
  const activities = Math.min(100, 30 + safeNumber(summary.activityCount) * 6);
  const achievements = Math.min(100, 25 + safeNumber(summary.awardCount) * 8);
  const overall = Math.round((academics + activities + achievements) / 3);
  return {
    overall,
    categories: {
      academics,
      extracurricular: activities,
      achievements
    },
    strengths: [
      "Consistent activity history",
      "Balanced academic profile",
      "Documented achievements"
    ],
    weaknesses: [
      "Add more long-term leadership roles",
      "Upload supporting documents",
      "Clarify intended major focus"
    ]
  };
}

function buildGapAnalysis() {
  return [
    { priority: "High", action: "Add one long-term leadership activity" },
    { priority: "Medium", action: "Upload recent transcripts and test scores" },
    { priority: "Low", action: "Refine intended major statement" }
  ];
}

function categorizeUniversities(universities, gpaScore) {
  const gpa = safeNumber(gpaScore, 3.4);
  
  // First pass: categorize based on selectivity_band
  let categorized = universities.map((uni, index) => {
    let category = "Target";
    let matchPercentage = 50 + Math.floor(Math.random() * 30); // 50-80% for target
    const selectivity = uni.selectivity_band || "";
    
    // Very High selectivity = Reach (top-tier universities)
    if (selectivity === "Very High") {
      category = "Reach";
      matchPercentage = 25 + Math.floor(Math.random() * 15); // 25-40% for reach
    }
    // Medium selectivity = Safety (more accessible universities)
    else if (selectivity === "Medium") {
      category = "Safety";
      matchPercentage = 60 + Math.floor(Math.random() * 20); // 60-80% for safety
    }
    // High selectivity - distribute between Target and Safety
    else if (selectivity === "High") {
      // Distribute High selectivity: 50% Target, 50% Safety to ensure we have Safety universities
      if (index % 2 === 0) {
        category = "Target";
        matchPercentage = 50 + Math.floor(Math.random() * 30); // 50-80% for target
      } else {
        category = "Safety";
        matchPercentage = 60 + Math.floor(Math.random() * 20); // 60-80% for safety
      }
    }
    // Fallback: Distribute by index if selectivity_band is missing
    else {
      if (index % 3 === 0) {
        category = "Reach";
        matchPercentage = 25 + Math.floor(Math.random() * 15);
      } else if (index % 3 === 1) {
        category = "Target";
        matchPercentage = 50 + Math.floor(Math.random() * 30);
      } else {
        category = "Safety";
        matchPercentage = 60 + Math.floor(Math.random() * 20);
      }
    }
    
    return {
      ...uni,
      category,
      matchPercentage,
      originalIndex: index
    };
  });
  
  // Count current distribution
  const reachCount = categorized.filter(u => u.category === "Reach").length;
  const targetCount = categorized.filter(u => u.category === "Target").length;
  const safetyCount = categorized.filter(u => u.category === "Safety").length;
  const totalCount = categorized.length;
  
  // Ensure minimum Safety universities (at least 20% of total, minimum 2)
  const minSafetyCount = Math.max(2, Math.floor(totalCount * 0.2));
  
  if (safetyCount < minSafetyCount) {
    // Find High selectivity Target universities to convert to Safety
    const highTargets = categorized
      .filter(u => u.category === "Target" && u.selectivity_band === "High")
      .sort((a, b) => a.originalIndex - b.originalIndex);
    
    const needMore = minSafetyCount - safetyCount;
    const toConvertIndices = highTargets.slice(0, Math.min(needMore, highTargets.length)).map(tc => tc.originalIndex);
    
    // Convert them to Safety
    categorized = categorized.map(uni => {
      if (toConvertIndices.includes(uni.originalIndex)) {
        return {
          ...uni,
          category: "Safety",
          matchPercentage: 60 + Math.floor(Math.random() * 20)
        };
      }
      return uni;
    });
  }
  
  // Adjust based on GPA if provided
  categorized = categorized.map((uni) => {
    let category = uni.category;
    let matchPercentage = uni.matchPercentage;
    
    if (gpa > 0) {
      if (gpa < 3.0 && category === "Reach") {
        // Very low GPA, downgrade Reach to Target
        category = "Target";
        matchPercentage = 40 + Math.floor(Math.random() * 20);
      } else if (gpa > 3.8 && category === "Safety") {
        // Very high GPA, can consider some Safety as Target (but keep at least some as Safety)
        // Only convert 30% of Safety to Target to maintain balance
        if (Math.random() < 0.3) {
          category = "Target";
          matchPercentage = 55 + Math.floor(Math.random() * 25);
        }
      }
    }
    
    return {
      ...uni,
      category,
      matchPercentage,
      explanation: category === "Reach" ? "Top-tier research, highly competitive" : 
                   category === "Safety" ? "Good match, accessible admission" : 
                   "Strong match, competitive admission"
    };
  });
  
  return categorized;
}

function buildChatResponse(message) {
  return {
    reply: `Thanks for your question! Here's a helpful starting point: ${message.slice(0, 120)}. I can tailor guidance once your profile is more complete.`,
    sources: ["MyEduPort profile data", "General admissions guidance"]
  };
}

function analyzeEssay(essayText) {
  // Extract plain text from HTML
  const plainText = essayText.replace(/<[^>]*>/g, "").trim();
  const wordCount = plainText.split(/\s+/).filter(w => w.length > 0).length;
  
  // Mock AI analysis - in production, this would call an actual AI service
  const grammarIssues = Math.floor(Math.random() * 5) + 1;
  const claritySuggestions = [
    "Consider rephrasing for better impact.",
    "This sentence could be more concise.",
    "Add a transition here to improve flow."
  ];
  const structureSuggestions = [
    "Good introduction, but body paragraphs need stronger topic sentences.",
    "Consider adding a conclusion that ties back to your opening.",
    "The middle section could benefit from more specific examples."
  ];
  
  return {
    grammar: {
      issues: grammarIssues,
      suggestions: grammarIssues > 0 ? [
        "Check subject-verb agreement in paragraph 2.",
        "Consider using a comma before the conjunction.",
        "This sentence is a run-on; consider splitting it."
      ].slice(0, grammarIssues) : []
    },
    clarity: {
      suggestions: claritySuggestions
    },
    structure: {
      suggestions: structureSuggestions
    },
    overall: {
      score: Math.min(95, 70 + Math.floor(Math.random() * 25)),
      feedback: "Your essay shows strong personal voice and clear narrative. Focus on tightening transitions and adding more specific details to strengthen your argument."
    }
  };
}

module.exports = {
  buildProfileScore,
  buildGapAnalysis,
  categorizeUniversities,
  buildChatResponse,
  analyzeEssay
};
