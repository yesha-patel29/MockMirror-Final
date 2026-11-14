import assert from 'assert';
import { heuristicResumeCheck, extractProfileFromText } from '../controllers/resumeController.js';
import { evaluateAnswerQuality } from '../services/adaptiveIntelligenceService.js';
import { detectCandidateIntent, buildInterviewContext, generateContextualInterviewTurn } from '../services/conversationService.js';

console.log('====================================================');
console.log('🧪 RUNNING RESUME VALIDATION & REPORT ANSWER FIX TESTS');
console.log('====================================================\n');

let passedTests = 0;
let totalTests = 0;

function runTest(testName, testFn) {
  totalTests++;
  try {
    testFn();
    console.log(`✅ PASS: ${testName}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ FAIL: ${testName}`);
    console.error(err);
  }
}

async function runAsyncTest(testName, testFn) {
  totalTests++;
  try {
    await testFn();
    console.log(`✅ PASS: ${testName}`);
    passedTests++;
  } catch (err) {
    console.error(`❌ FAIL: ${testName}`);
    console.error(err);
  }
}

// ─────────────────────────────────────────────────────────────────
// SUITE 1: RESUME CONTENT VALIDATION (ISSUE 1)
// ─────────────────────────────────────────────────────────────────

const validResume1 = `
Alex Johnson
Email: alex.johnson@example.com | Phone: +1 555-0199 | San Francisco, CA
LinkedIn: linkedin.com/in/alexjohnson | GitHub: github.com/alexj

PROFESSIONAL SUMMARY
Results-driven Software Engineer with 3+ years of experience in full-stack web development,
cloud architecture, and microservices using React, Node.js, and PostgreSQL.

EDUCATION
Bachelor of Technology in Computer Science & Engineering
Stanford University, 2018 - 2022 | GPA: 3.8/4.0

TECHNICAL SKILLS
Languages: JavaScript, TypeScript, Python, Java, SQL
Frameworks & Libraries: React, Next.js, Node.js, Express, Django
Databases: PostgreSQL, MongoDB, Redis
DevOps & Tools: Docker, Kubernetes, AWS (S3, EC2, Lambda), Git, CI/CD

WORK EXPERIENCE
Software Engineer | Acme Technologies, San Francisco | 2022 - Present
- Architected and deployed scalable REST APIs serving 500k daily active users.
- Optimized database queries in PostgreSQL, reducing query latency by 42%.

PROJECTS
E-Commerce Microservices Platform (React, Node.js, Docker, AWS)
- Developed a distributed e-commerce backend handling payments and inventory.
`;

const validResume2 = `
Priya Sharma
priya.sharma@gmail.com | +91 9876543210 | Bengaluru, India
github.com/priyasharma | linkedin.com/in/priya-sharma

Objective: Aspiring Full Stack Developer looking to contribute to innovative software solutions.

Education:
B.E. in Information Technology
Visvesvaraya Technological University, 2020 - 2024
CGPA: 8.9 / 10.0

Technical Skills:
- Programming: Python, C++, JavaScript, Java
- Web Technologies: React.js, HTML5, CSS3, Node.js, Express
- Databases: MySQL, MongoDB

Academic Projects:
1. Real-Time Chat Application: Built using React, Node.js, and Socket.io with JWT authentication.
2. Smart Healthcare Portal: Developed an appointment scheduling system with automated notifications.

Certifications:
- AWS Certified Cloud Practitioner (2023)
- Full Stack Web Development Bootcamp (2023)
`;

const nonResumeArticle = `
The History of Modern Astronomy and Space Exploration
Published by Science Today Magazine - October 2023

For millennia, humans have gazed into the night sky wondering about the origins of the cosmos.
From the earliest Babylonian star catalogs to Ptolemy's geocentric model, the quest to map
the celestial sphere has driven scientific innovation across generations.

In 1609, Galileo Galilei constructed a telescope capable of magnifying distant bodies by a
factor of twenty. Turning his instrument toward Jupiter, he discovered four moons orbiting
the gas giant, fundamentally challenging the Aristotelian orthodoxy that all heavenly
bodies revolve around the Earth. Newton later synthesized these astronomical observations
into a universal theory of gravitation.
`;

const nonResumeAdvertisement = `
Super Summer Blowout Sale - Up to 70% Off All Electronics!
Visit our megastore located on 5th Avenue or shop online at www.superdeals-shop.com.

Limited time offer: Get the latest UltraHD 4K Smart TVs starting at only $299!
Buy one pair of noise-canceling headphones and get the second pair at 50% discount.
Free shipping on all orders over $50! Use coupon code SUMMER70 at checkout.
Terms and conditions apply. No refunds after 30 days. Financing available through QuickPay.
`;

const nonResumeWebsiteDoc = `
Terms of Service and Privacy Policy
Last updated: January 1, 2024

1. Introduction
Welcome to CloudSync Services. By accessing or using our websites, APIs, or software applications,
you agree to be bound by these Terms of Service. If you do not agree to all provisions,
you must immediately discontinue your use of our platform.

2. Intellectual Property Rights
All trademarks, service marks, trade names, and copyrighted materials appearing on the service
are the exclusive property of CloudSync Technologies Inc. You may not reproduce, distribute,
or create derivative works without prior written consent from our legal department.

3. Limitation of Liability
Under no circumstances shall CloudSync Inc. be liable for any indirect, incidental, special,
punitive, or consequential damages arising from service interruptions or data transmission failures.
`;

runTest('Resume Validation: Valid Software Engineer Resume is accepted', () => {
  const result = heuristicResumeCheck(validResume1);
  assert.strictEqual(result.isResume, true, 'Valid resume should be accepted');
  assert.ok(result.reason.includes('Matched') || result.reason.includes('resume'), 'Should include valid match reason');
});

runTest('Resume Validation: Valid Fresher Resume is accepted', () => {
  const result = heuristicResumeCheck(validResume2);
  assert.strictEqual(result.isResume, true, 'Valid fresher resume should be accepted');
});

runTest('Resume Validation: Random Science Article PDF is rejected', () => {
  const result = heuristicResumeCheck(nonResumeArticle);
  assert.strictEqual(result.isResume, false, 'Random article should be rejected');
  assert.ok(result.reason.includes('not appear to be a resume') || result.reason.includes('lacks essential'), 'Should explain rejection reason');
});

runTest('Resume Validation: Commercial Advertisement PDF is rejected', () => {
  const result = heuristicResumeCheck(nonResumeAdvertisement);
  assert.strictEqual(result.isResume, false, 'Commercial advertisement should be rejected');
});

runTest('Resume Validation: Website Terms of Service / Privacy Policy is rejected', () => {
  const result = heuristicResumeCheck(nonResumeWebsiteDoc);
  assert.strictEqual(result.isResume, false, 'Terms of service doc should be rejected');
});

runTest('Resume Validation: Short / Empty text is rejected with clear message', () => {
  const result = heuristicResumeCheck('This is just one single line of random text.');
  assert.strictEqual(result.isResume, false, 'Short text must be rejected');
  assert.ok(result.reason.includes('too short'), 'Should specify document is too short');
});

runTest('Resume Parsing: Handles C++, C#, and special character skills without regex crash', () => {
  const profile = extractProfileFromText(validResume2, 'C/C++ Developer');
  assert.ok(profile, 'Profile should be extracted');
  assert.ok(Array.isArray(profile.skills), 'Skills should be an array');
  assert.ok(profile.skills.includes('C++'), 'C++ should be safely detected without regex crash');
  assert.ok(profile.skills.includes('Python'), 'Python should be detected');
});

// ─────────────────────────────────────────────────────────────────
// SUITE 2: INTENT DETECTION FOR "I DON'T KNOW", SKIPPED, ETC. (ISSUE 2)
// ─────────────────────────────────────────────────────────────────

runTest('Intent Detection: "I don\'t know"', () => {
  assert.strictEqual(detectCandidateIntent("I don't know"), 'dont_know');
  assert.strictEqual(detectCandidateIntent("i dont know"), 'dont_know');
  assert.strictEqual(detectCandidateIntent("I do not know"), 'dont_know');
});

runTest('Intent Detection: "I don\'t remember"', () => {
  assert.strictEqual(detectCandidateIntent("I don't remember"), 'dont_know');
  assert.strictEqual(detectCandidateIntent("I cannot remember the exact syntax"), 'dont_know');
  assert.strictEqual(detectCandidateIntent("I can't recall right now"), 'dont_know');
});

runTest('Intent Detection: "I\'m not sure"', () => {
  assert.strictEqual(detectCandidateIntent("I'm not sure"), 'dont_know');
  assert.strictEqual(detectCandidateIntent("I am not sure about this topic"), 'dont_know');
});

runTest('Intent Detection: "I cannot answer this question"', () => {
  assert.strictEqual(detectCandidateIntent("I cannot answer this question"), 'dont_know');
  assert.strictEqual(detectCandidateIntent("I can't answer this"), 'dont_know');
  assert.strictEqual(detectCandidateIntent("unable to answer"), 'dont_know');
});

runTest('Intent Detection: "skip the question"', () => {
  assert.strictEqual(detectCandidateIntent("Can we skip this question?"), 'skip_question');
  assert.strictEqual(detectCandidateIntent("skip this question please"), 'skip_question');
  assert.strictEqual(detectCandidateIntent("let's skip"), 'skip_question');
});

// ─────────────────────────────────────────────────────────────────
// SUITE 3: QUESTION-SPECIFIC SUGGESTED ANSWERS (ISSUE 2)
// ─────────────────────────────────────────────────────────────────

await runAsyncTest('Question-Specific Answers: Java vs JavaScript produces specific ideal answer', async () => {
  const q1 = 'What is the fundamental difference between Java and JavaScript?';
  const eval1 = await evaluateAnswerQuality({
    question: q1,
    answer: "I don't know",
    domain: 'Software Engineering',
    currentDifficultyLevel: 2,
  });

  assert.ok(eval1.suggestedAnswer, 'Suggested answer must be present');
  assert.ok(eval1.suggestedAnswer.length > 20, 'Suggested answer must be detailed');
  // Must reference Java, JavaScript, or the specific question topic
  assert.ok(
    eval1.suggestedAnswer.toLowerCase().includes('java'),
    'Suggested answer must address the question topic'
  );
  // Must NOT be a meta-instruction ("You should explain", "A strong response should")
  const metaRegex = /(a strong response should|you should (explain|define|outline|cover)|the candidate should)/i;
  assert.strictEqual(
    metaRegex.test(eval1.suggestedAnswer),
    false,
    'Suggested answer must be an actual spoken answer, NOT a meta-instruction'
  );
  // Feedback should indicate candidate was unable to answer
  assert.ok(
    eval1.reason.toLowerCase().includes('unable') ||
    eval1.reason.toLowerCase().includes('know') ||
    eval1.reason.toLowerCase().includes('weak'),
    'Feedback should identify that candidate did not know'
  );
  assert.strictEqual(eval1.answerScore <= 3, true, 'Score should reflect lack of answer (<= 3)');
});

await runAsyncTest('User Screenshot Scenario: RESTful API and database locking yields spoken answer, NOT meta-instructions', async () => {
  const qRestLocking = 'How do you design a robust RESTful API and handle database locking?';
  const evalLocking = await evaluateAnswerQuality({
    question: qRestLocking,
    answer: "designing a robust is full epi and handling database locking effectively and I don't know about anything",
    domain: 'Software Engineer',
    currentDifficultyLevel: 3,
  });

  assert.ok(evalLocking.suggestedAnswer, 'Suggested answer must be present');
  // Must NOT contain the exact meta-instruction from the user screenshot:
  // "a strong response should define the core concept, describe its practical architectural implementation..."
  const metaRegex = /(a strong response should|you should (define|explain|outline|describe|mention)|the candidate should)/i;
  assert.strictEqual(
    metaRegex.test(evalLocking.suggestedAnswer),
    false,
    'Suggested answer must NOT contain meta-instruction phrases like "a strong response should define..."'
  );

  // Must contain real technical content on REST and locking
  const lower = evalLocking.suggestedAnswer.toLowerCase();
  assert.ok(
    lower.includes('rest') || lower.includes('http') || lower.includes('resource') || lower.includes('api'),
    'Answer must explain REST principles'
  );
  assert.ok(
    lower.includes('lock') || lower.includes('optimistic') || lower.includes('concurrency') || lower.includes('transaction'),
    'Answer must address database locking / concurrency'
  );
});

await runAsyncTest('Question-Specific Answers: SQL vs NoSQL produces DISTINCT answer from Java question', async () => {
  const q2 = 'When would you choose a NoSQL database like MongoDB over a relational database like PostgreSQL?';
  const eval2 = await evaluateAnswerQuality({
    question: q2,
    answer: "I don't know",
    domain: 'Backend Development',
    currentDifficultyLevel: 2,
  });

  const q1 = 'What is the fundamental difference between Java and JavaScript?';
  const eval1 = await evaluateAnswerQuality({
    question: q1,
    answer: "I don't know",
    domain: 'Software Engineering',
    currentDifficultyLevel: 2,
  });

  // Both should be unique and NOT identical
  assert.notStrictEqual(
    eval1.suggestedAnswer,
    eval2.suggestedAnswer,
    'Suggested answers for different questions must NOT be identical'
  );
});

await runAsyncTest('Identical user answers to different questions receive independent, question-specific evaluations', async () => {
  const sameAnswer = "I use Node.js and React with a cloud architecture.";

  const qA = 'How do you prevent SQL injection in relational database queries?';
  const evalA = await evaluateAnswerQuality({
    question: qA,
    answer: sameAnswer,
    domain: 'Software Engineering',
    currentDifficultyLevel: 2,
  });

  const qB = 'How does the event loop handle asynchronous I/O operations in Node.js?';
  const evalB = await evaluateAnswerQuality({
    question: qB,
    answer: sameAnswer,
    domain: 'Software Engineering',
    currentDifficultyLevel: 2,
  });

  // The suggested answers must be distinct and specific to their respective questions
  assert.notStrictEqual(
    evalA.suggestedAnswer,
    evalB.suggestedAnswer,
    'Suggested answers must address their respective questions, not be duplicated'
  );
});

runTest('buildInterviewContext: Current question is cleanly identified without conversational filler', () => {
  const plannedQuestions = [
    { id: 'q_1', question: 'What is the event loop in Node.js?', type: 'domain_based' },
    { id: 'q_2', question: 'Explain the difference between SQL and NoSQL databases.', type: 'domain_based' },
  ];

  const conversationHistory = [
    { role: 'interviewer', text: 'Hello Alex! Welcome. Could you introduce yourself?' },
    { role: 'candidate', text: 'Hi, I am Alex.' },
    { role: 'interviewer', text: 'Great to meet you Alex! Let us begin: What is the event loop in Node.js?' },
  ];

  // When candidate answers Q1 (plannedIdx = 1, since questionsAsked = 1)
  const ctx = buildInterviewContext({
    domain: 'Software Engineering',
    conversationHistory,
    userAnswer: 'The event loop processes non-blocking I/O operations.',
    plannedQuestions,
    currentQuestionIndex: 1,
  });

  // ctx.currentQuestion should cleanly match Q1
  assert.strictEqual(
    ctx.currentQuestion,
    'What is the event loop in Node.js?',
    'Current question should be clean without interviewer greeting filler'
  );
});

runTest('Contextual Interview Turn Fallback: Question-specific suggested answers on "I don\'t know"', () => {
  const turn = generateContextualInterviewTurn({
    candidateName: 'Alex',
    targetRole: 'Software Developer',
    questionsAsked: 1,
    totalQuestions: 5,
    userAnswer: "I don't know",
    currentQuestion: 'How does indexing work in relational databases?',
    currentPlannedQuestion: { question: 'What is REST API idempotency?' },
  });

  assert.ok(turn.evaluation, 'Evaluation must be present');
  assert.ok(
    turn.evaluation.suggestedAnswer.includes('indexing') ||
    turn.evaluation.suggestedAnswer.includes('How does indexing work in relational databases'),
    'Suggested answer must address the specific question topic'
  );
  assert.strictEqual(turn.evaluation.score, 2, 'Score should be 2 for "I don\'t know"');
});

console.log('\n====================================================');
console.log(`📊 SUMMARY: ${passedTests} / ${totalTests} TESTS PASSED`);
if (passedTests === totalTests) {
  console.log('🎉 ALL RESUME & REPORT FIX TESTS PASSED SUCCESSFULLY!');
} else {
  console.log(`⚠️ ${totalTests - passedTests} TEST(S) FAILED`);
}
console.log('====================================================');
