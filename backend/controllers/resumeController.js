/**
 * Resume Controller
 * Handles PDF resume upload, binary signature verification,
 * text extraction, content validation, and automated profile/skills extraction.
 */

import pdfParse from 'pdf-parse';
import { getGeminiClient, generateWithGeminiFallback, extractJSON } from '../services/conversationService.js';

/**
 * Heuristic check: does extracted text look like a resume?
 * Returns { isResume: boolean, reason: string }
 */
export function heuristicResumeCheck(text = '') {
  const lower = text.toLowerCase();
  const length = text.trim().length;

  // Too short to be a resume
  if (length < 100) {
    return { isResume: false, reason: 'The document is too short to be a valid resume.' };
  }

  // Resume indicator keywords — count how many categories are present
  const indicators = {
    contact: /\b(email|e-mail|phone|mobile|contact|linkedin|github)\b/i,
    education: /\b(education|university|college|degree|bachelor|master|b\.tech|b\.e\.|m\.tech|m\.s\.|b\.sc|m\.sc|diploma|gpa|cgpa|graduation)\b/i,
    experience: /\b(experience|work history|employment|internship|worked at|company|organization|role|position|responsibilities)\b/i,
    skills: /\b(skills|technical skills|technologies|proficiencies|tools|programming|languages|frameworks|competencies)\b/i,
    projects: /\b(projects|project|developed|implemented|built|created|designed|architected)\b/i,
    personal: /\b(objective|summary|profile|about me|career|professional summary|personal)\b/i,
    certifications: /\b(certification|certified|certificate|award|achievement|honor|coursework)\b/i,
  };

  let matchedCategories = 0;
  for (const [, regex] of Object.entries(indicators)) {
    if (regex.test(text)) matchedCategories++;
  }

  // A legitimate resume should match at least 3 out of 7 indicator categories
  if (matchedCategories >= 3) {
    return { isResume: true, reason: `Matched ${matchedCategories}/7 resume indicator categories.` };
  }

  // Check for email pattern (almost all resumes have one)
  const hasEmail = /[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/.test(text);

  // If has email + at least 2 categories, still likely a resume
  if (hasEmail && matchedCategories >= 2) {
    return { isResume: true, reason: `Contains email and ${matchedCategories} resume sections.` };
  }

  // Too few resume indicators
  if (matchedCategories < 2) {
    return {
      isResume: false,
      reason: 'This document does not appear to be a resume. It lacks essential resume sections such as education, experience, skills, or contact information. Please upload a valid resume PDF.',
    };
  }

  // Borderline — let it pass but flag it
  return { isResume: true, reason: `Borderline resume detection (${matchedCategories} categories).` };
}

/**
 * AI-powered resume validation using Gemini.
 * Returns { isResume: boolean, reason: string } or null if AI is unavailable.
 */
export async function aiResumeValidation(text) {
  const client = getGeminiClient();
  if (!client) return null;

  const excerpt = text.slice(0, 2000);
  const prompt = `You are an expert document classifier. Analyze the following document text and determine whether it is a genuine resume/CV or not.

A genuine resume/CV typically contains:
- Personal contact information (name, email, phone)
- Education history (degrees, institutions)
- Work experience or internships
- Technical or professional skills
- Projects, certifications, or achievements

The document is NOT a resume if it is:
- A random article, research paper, or academic publication
- A product manual, user guide, or technical documentation
- An advertisement, brochure, or marketing material
- A legal document, invoice, or receipt
- A website page, blog post, or news article
- Random or nonsensical text
- A cover letter alone (without resume content)

Document text:
"""
${excerpt}
"""

Return ONLY valid JSON:
{
  "isResume": true or false,
  "confidence": "high" or "medium" or "low",
  "reason": "One clear sentence explaining why this is or is not a resume"
}`;

  try {
    const { text: responseText } = await generateWithGeminiFallback(prompt);
    const parsed = extractJSON(responseText);
    if (parsed && typeof parsed.isResume === 'boolean') {
      return {
        isResume: parsed.isResume,
        reason: parsed.reason || (parsed.isResume ? 'AI classified this as a resume.' : 'AI determined this is not a resume.'),
        confidence: parsed.confidence || 'medium',
      };
    }
  } catch (err) {
    console.warn('[aiResumeValidation] AI validation unavailable, relying on heuristic:', err.message);
  }

  return null; // AI unavailable — fall back to heuristic
}

/**
 * Heuristic fallback parser to extract candidate profile from text
 */
export function extractProfileFromText(text = '', targetRole = '') {
  const lines = text
    .split(/\r?\n/)
    .map(l => l.trim())
    .filter(Boolean);

  // Email
  const emailMatch = text.match(/[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}/);
  const email = emailMatch ? emailMatch[0] : '';

  // Name (typically the first line or first line before email)
  let name = '';
  for (const line of lines.slice(0, 5)) {
    if (line.includes('@') || /http|github|linkedin|resume|curriculum/i.test(line)) continue;
    if (line.length > 2 && line.length < 40 && !/[0-9]/.test(line)) {
      name = line;
      break;
    }
  }

  // Location / City
  let location = '';
  const locationMatch = text.match(/\b(New York|San Francisco|London|Bangalore|Bengaluru|Mumbai|Delhi|Hyderabad|Pune|Seattle|Boston|Austin|Toronto|Remote)\b/i);
  if (locationMatch) location = locationMatch[0];

  // College / University
  let college = '';
  for (const line of lines) {
    if (/(university|institute|college|school of technology|academy)/i.test(line) && line.length < 80) {
      college = line.replace(/^(education|academic)\s*[:\-]?\s*/i, '').trim();
      break;
    }
  }

  // Degree & Branch
  let degree = '';
  const degreeMatch = text.match(/\b(B\.Tech|B\.E\.|BSc|B\.S\.|Bachelor of [A-Za-z]+|M\.Tech|M\.E\.|MSc|M\.S\.|Master of [A-Za-z]+|PhD)\b/i);
  if (degreeMatch) degree = degreeMatch[0];

  let branch = '';
  const branchMatch = text.match(/\b(Computer Science|Information Technology|Data Science|Software Engineering|Electrical Engineering|Mechanical Engineering|ECE|CSE)\b/i);
  if (branchMatch) branch = branchMatch[0];

  // Graduation Year
  let graduationYear = null;
  const yearMatch = text.match(/\b(20[0-3][0-9])\b/g);
  if (yearMatch && yearMatch.length > 0) {
    graduationYear = parseInt(yearMatch[yearMatch.length - 1], 10);
  }

  // Experience Years
  let experienceYears = '0';
  const expMatch = text.match(/(\d+)\+?\s*(?:years?|yrs?)\s*(?:of)?\s*experience/i);
  if (expMatch) {
    experienceYears = expMatch[1];
  } else if (/fresher|intern|student/i.test(text)) {
    experienceYears = '0';
  }

  // Skills
  const knownSkills = [
    'JavaScript', 'TypeScript', 'Python', 'Java', 'C++', 'C#', 'Go', 'Rust', 'PHP', 'Ruby',
    'React', 'Next.js', 'Vue', 'Angular', 'Node.js', 'Express', 'Django', 'FastAPI', 'Spring Boot',
    'PostgreSQL', 'MySQL', 'MongoDB', 'Redis', 'GraphQL', 'REST API',
    'Docker', 'Kubernetes', 'AWS', 'Azure', 'GCP', 'Git', 'CI/CD', 'Linux',
    'Pandas', 'NumPy', 'TensorFlow', 'PyTorch', 'Scikit-Learn',
  ];

  function matchesSkill(skill, fullText) {
    const escaped = skill.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    const startPattern = /^\w/.test(skill) ? '\\b' : '(?:^|[^a-zA-Z0-9])';
    const endPattern = /\w$/.test(skill) ? '\\b' : '(?=[^a-zA-Z0-9]|$)';
    try {
      const rx = new RegExp(`${startPattern}${escaped}${endPattern}`, 'i');
      return rx.test(fullText);
    } catch {
      return fullText.toLowerCase().includes(skill.toLowerCase());
    }
  }

  const foundSkills = knownSkills.filter(s => matchesSkill(s, text));

  // Projects
  const foundProjects = [];
  let inProjects = false;
  for (const line of lines) {
    if (/^(projects|academic projects|key projects)/i.test(line)) {
      inProjects = true;
      continue;
    }
    if (inProjects) {
      if (/^(experience|skills|education|certifications|awards)/i.test(line)) {
        inProjects = false;
        continue;
      }
      if (line.length > 5 && line.length < 80 && !line.startsWith('http') && !line.includes('@')) {
        foundProjects.push(line.replace(/^[\s•\-*0-9.]+\s*/, ''));
        if (foundProjects.length >= 4) break;
      }
    }
  }

  return {
    name,
    email,
    location,
    college,
    degree,
    branch,
    graduationYear,
    experienceYears,
    skills: foundSkills,
    projects: foundProjects,
    targetRole: targetRole || 'Software Developer',
  };
}

/**
 * POST /resume/upload
 * Validates uploaded PDF, extracts text, validates content is a resume,
 * and returns initial profile.
 */
export async function uploadResume(req, res) {
  try {
    if (!req.file || !req.file.buffer) {
      return res.status(400).json({
        error: 'NO_FILE',
        message: 'No resume file was uploaded. Please select a PDF file.',
      });
    }

    const buffer = req.file.buffer;

    // Strict %PDF- signature check
    const headerStr = buffer.slice(0, 1024).toString('binary');
    if (!headerStr.includes('%PDF-')) {
      return res.status(400).json({
        error: 'NOT_A_RESUME',
        message: 'The uploaded file does not have a valid PDF binary signature (%PDF-).',
      });
    }

    let parsedPdf;
    try {
      parsedPdf = await pdfParse(buffer);
    } catch (parseErr) {
      console.error('[uploadResume] PDF parse error:', parseErr.message);
      // Detect common parse failure reasons
      const errMsg = (parseErr.message || '').toLowerCase();
      if (errMsg.includes('password') || errMsg.includes('encrypted')) {
        return res.status(400).json({
          error: 'PASSWORD_PROTECTED',
          message: 'This PDF is password-protected or encrypted. Please upload an unprotected resume PDF.',
        });
      }
      return res.status(400).json({
        error: 'PARSE_FAILED',
        message: 'This PDF file appears to be corrupted or unreadable. Please upload a valid resume PDF.',
      });
    }

    const extractedText = (parsedPdf.text || '').trim();

    if (extractedText.length < 50) {
      return res.status(400).json({
        error: 'INSUFFICIENT_CONTENT',
        message: "Couldn't extract readable text from this PDF. The file may be empty, scanned as an image, or corrupted. Please upload a text-based resume PDF.",
      });
    }

    // ── Resume Content Validation ──
    // Step 1: Try AI-powered validation (more accurate)
    const aiResult = await aiResumeValidation(extractedText);

    if (aiResult) {
      // AI validation was available
      if (!aiResult.isResume) {
        console.log(`[uploadResume] AI rejected document: ${aiResult.reason}`);
        return res.status(400).json({
          error: 'NOT_A_RESUME',
          message: aiResult.reason || 'The uploaded document does not appear to be a resume. Please upload a valid resume PDF containing your education, experience, skills, and contact information.',
        });
      }
      console.log(`[uploadResume] AI accepted document as resume (${aiResult.confidence}): ${aiResult.reason}`);
    } else {
      // Step 2: AI unavailable — use heuristic validation
      const heuristicResult = heuristicResumeCheck(extractedText);
      if (!heuristicResult.isResume) {
        console.log(`[uploadResume] Heuristic rejected document: ${heuristicResult.reason}`);
        return res.status(400).json({
          error: 'NOT_A_RESUME',
          message: heuristicResult.reason,
        });
      }
      console.log(`[uploadResume] Heuristic accepted document: ${heuristicResult.reason}`);
    }

    const candidateProfile = extractProfileFromText(extractedText);

    res.status(200).json({
      success: true,
      extractedText,
      resumeText: extractedText,
      candidateProfile,
    });
  } catch (err) {
    console.error('[uploadResume error]', err);
    const errMsg = (err.message || '').toLowerCase();
    if (errMsg.includes('password') || errMsg.includes('encrypted')) {
      return res.status(400).json({
        error: 'PASSWORD_PROTECTED',
        message: 'This PDF is password-protected or encrypted. Please upload an unprotected resume PDF.',
      });
    }
    res.status(400).json({
      error: 'PARSE_FAILED',
      message: `Failed to process PDF: ${err.message}`,
    });
  }
}

/**
 * POST /resume/analyze
 * Analyzes resume text against target role using Gemini with heuristic fallback.
 */
export async function analyzeResume(req, res) {
  try {
    const { resumeText = '', targetRole = 'Software Developer' } = req.body;

    if (!resumeText || resumeText.trim().length < 20) {
      return res.status(400).json({
        error: 'MISSING_TEXT',
        message: 'Resume text is required for analysis.',
      });
    }

    const client = getGeminiClient();
    if (client) {
      const prompt = `You are an expert technical recruiter analyzing a candidate's resume for target role "${targetRole}".
Resume Text:
"""
${resumeText.slice(0, 3500)}
"""

Extract candidate information accurately. Return ONLY valid JSON:
{
  "name": "Candidate Full Name or empty",
  "email": "Email or empty",
  "location": "City or empty",
  "college": "College / University name or empty",
  "degree": "Degree name or empty",
  "branch": "Major / Branch or empty",
  "graduationYear": 2024,
  "experienceYears": "0" | "1" | "2" | "3" | "5+",
  "skills": ["Skill1", "Skill2"],
  "projects": ["Project 1", "Project 2"],
  "strengths": ["Key resume strength 1", "Key resume strength 2"],
  "improvements": ["Resume improvement recommendation 1"]
}`;

      try {
        const { text } = await generateWithGeminiFallback(prompt);
        const parsed = extractJSON(text);
        if (parsed && typeof parsed === 'object') {
          return res.status(200).json(parsed);
        }
      } catch (err) {
        console.warn('[analyzeResume Gemini fallback]:', err.message);
      }
    }

    // Heuristic fallback
    const heuristicProfile = extractProfileFromText(resumeText, targetRole);
    res.status(200).json({
      ...heuristicProfile,
      strengths: ['Identified relevant technical skills and project involvement'],
      improvements: ['Quantify project outcomes and impact with measurable engineering metrics'],
    });
  } catch (err) {
    console.error('[analyzeResume error]', err);
    res.status(500).json({
      error: 'ANALYSIS_FAILED',
      message: err.message,
    });
  }
}

export default {
  uploadResume,
  analyzeResume,
  heuristicResumeCheck,
  aiResumeValidation,
  extractProfileFromText,
};
