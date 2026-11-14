/**
 * MockMirror Ideal Answer Generation Engine
 *
 * Generates complete, technically accurate, ready-to-speak interview answers
 * written in natural spoken first-person interview language.
 *
 * STRICT RULE: Never outputs meta-instructions ("You should explain...", "A strong response should...").
 * Outputs the literal answer that a top-tier candidate speaks aloud during an interview.
 */

/**
 * Curated ground-truth technical & behavioral interview answers.
 * Matched by topic keywords when offline or as high-precision fallback.
 */
const CURATED_ANSWERS = [
  {
    keywords: ['restful api', 'database locking'],
    answer: `To design a robust RESTful API, I follow standard REST architectural constraints: resources are identified by clear nouns in URIs (such as /api/v1/orders), stateless communication is enforced using token-based authentication (like JWT), and standard HTTP methods are used according to their semantics—GET for safe retrieval, POST for creation, PUT or PATCH for idempotent updates, and DELETE for removal. I ensure all responses return predictable HTTP status codes (such as 200 OK, 201 Created, 400 Bad Request, and 500 Internal Error) alongside structured JSON error payloads, comprehensive input validation, and rate limiting.

For database locking, I evaluate the expected concurrency and contention levels. In read-heavy scenarios with low collision probability, I apply optimistic locking using a version number or timestamp column, verifying at commit time that the row has not been modified by another transaction. In high-contention, write-heavy financial or inventory transactions where conflicts are critical, I use pessimistic locking (such as SELECT FOR UPDATE in SQL) within an explicit database transaction to hold an exclusive lock until the update is committed, preventing race conditions and double-spending.`,
  },
  {
    keywords: ['restful api', 'what is a rest', 'rest api', 'restful'],
    answer: `A RESTful API is an application programming interface that adheres to the architectural principles of REST (Representational State Transfer). It enables different software systems to communicate over HTTP in a standardized, stateless, and scalable manner.

In a RESTful architecture, data entities are modeled as resources identified by unique endpoints (URLs). Clients interact with these resources using standard HTTP verbs: GET retrieves data without side effects, POST creates new resources, PUT replaces existing resources, PATCH applies partial updates, and DELETE removes resources. Each request from the client must contain all necessary context and authentication credentials, as the server maintains no client session state between calls.`,
  },
  {
    keywords: ['indexing', 'b-tree', 'database index', 'indexes work', 'indexing work'],
    answer: `Database indexing works by constructing a specialized auxiliary data structure—most commonly a self-balancing B-Tree or B+Tree—on one or more columns of a table. Instead of scanning every single row in the table (an O(N) full table scan), the database traverses the hierarchical tree structure in O(log N) time to locate the exact disk block pointer pointing to the requested row.

In a B+Tree index, internal nodes store search keys and navigation pointers, while all actual row pointers or table data are kept in doubly linked leaf nodes at the bottom. This structure allows extremely fast point lookups as well as highly efficient range scans (such as BETWEEN or inequality queries). While indexes dramatically accelerate SELECT and ORDER BY queries, they introduce write overhead on INSERT, UPDATE, and DELETE operations because the database must keep all associated indexes updated. Therefore, I selectively index columns that appear frequently in WHERE clauses, JOIN conditions, and foreign keys.`,
  },
  {
    keywords: ['caching', 'redis', 'cache-aside'],
    answer: `Caching reduces database load and network latency by keeping frequently accessed data in high-speed, in-memory storage like Redis or Memcached. In web services, I typically use the Cache-Aside pattern: when a read request arrives, the application first checks the cache; on a cache hit, data returns immediately with sub-millisecond latency. On a cache miss, the data is fetched from the primary database, populated into the cache with an explicit Time-To-Live (TTL), and returned.

To maintain consistency and prevent stale data, updates invalidate or refresh corresponding cache keys. I also implement defensive techniques like randomized TTL jitter to prevent cache stampedes, and cache null values briefly to protect the database against cache penetration attacks.`,
  },
  {
    keywords: ['nosql', 'relational vs nosql', 'mongodb over', 'sql vs nosql', 'relational database like postgresql'],
    answer: `Relational databases like PostgreSQL and MySQL organize data into structured tables with strict schemas and foreign-key constraints, guaranteeing ACID compliance. They are the ideal choice for applications requiring complex joins, multi-table transactions, and strict data consistency, such as financial and accounting systems.

NoSQL databases like MongoDB, Cassandra, or Redis use flexible document, key-value, or wide-column data models that scale horizontally by partitioning data across clusters. They excel in scenarios with high-velocity unstructured data, rapid schema evolution, or high-throughput distributed caching where horizontal scaling and write performance take precedence over relational joins.`,
  },
  {
    keywords: ['git', 'version control', 'branching'],
    answer: `Git is a distributed version control system that tracks source code revisions across branches. I use Git branching strategies (like trunk-based development or GitFlow) to isolate features, conduct peer code reviews through pull requests, resolve merge conflicts, and trigger automated CI/CD pipelines upon merging to main branches.`,
  },
  {
    keywords: ['ci/cd', 'continuous integration', 'deployment pipeline'],
    answer: `A CI/CD pipeline automates the software integration and deployment lifecycle. Upon every pull request, the Continuous Integration stage runs automated linters, static security scans, and unit tests to ensure code quality before merging. Once merged to the main branch, Continuous Delivery builds containerized Docker artifacts and automatically deploys them to staging and production environments using zero-downtime rolling or blue-green deployments.`,
  },
  {
    keywords: ['polymorphism', 'inheritance'],
    answer: `Polymorphism and inheritance are two fundamental pillars of object-oriented programming. Inheritance allows a derived child class to inherit fields and behaviors from an existing base class, creating an 'is-a' relationship and eliminating boilerplate code—for example, a Cat class inheriting core attributes from an Animal base class. Interface inheritance, on the other hand, defines a formal contract of method signatures without implementation, enabling completely distinct classes to expose uniform capabilities.

Polymorphism, meaning 'many forms', allows objects of different underlying classes to be accessed through a common interface or superclass reference. We utilize compile-time polymorphism through method overloading, and runtime polymorphism through method overriding. In runtime polymorphism, the exact method executed is resolved dynamically at runtime based on the actual concrete instance, allowing systems to remain extensible and loosely coupled without tightly depending on specific class implementations.`,
  },
  {
    keywords: ['abstract class', 'interface'],
    answer: `An abstract class is a partially implemented base class that can declare both abstract methods (which subclasses must implement) and fully realized concrete methods, stateful fields, and constructors. Because of single inheritance in languages like Java or C++, a class can extend only one abstract class. An interface, by contrast, is a pure architectural contract defining method signatures that any class can implement, and languages allow a class to implement multiple interfaces simultaneously.

I choose an abstract class when classes share a strong identity ('is-a' relationship) and benefit from shared state or internal helper logic. I choose an interface when defining a shared capability or behavior ('can-do' relationship) across completely unrelated classes, such as Comparable, Serializable, or Disposable.`,
  },
  {
    keywords: ['memory leak', 'heap dump'],
    answer: `To debug a production memory leak, I first inspect memory consumption graphs and garbage collection frequency using APM tools like Prometheus or Datadog. I take heap dump snapshots at different intervals and analyze them using tools like Chrome DevTools, Eclipse Memory Analyzer (MAT), or Node.js heap profilers. I look for objects retaining large amounts of memory that refuse to be collected—most commonly dangling event listeners, unclosed database connections, global caches without TTL policies, or circular closures.`,
  },
  {
    keywords: ['tdd', 'test-driven development', 'unit testing'],
    answer: `Test-Driven Development (TDD) follows a strict three-phase cycle: Red, Green, Refactor. First, I write an automated unit test that defines the expected behavior and watch it fail (Red). Next, I implement the minimal production code necessary to pass the test (Green). Finally, I refactor the code to improve modularity and clean code standards while keeping all tests passing. TDD forces modular software design, acts as living documentation, and provides confidence against regressions.`,
  },
  {
    keywords: ['transaction isolation', 'concurrency anomaly', 'acid'],
    answer: `Database transaction isolation controls how concurrent transactions see changes made by one another, as defined by ACID properties. The SQL standard defines four isolation levels to manage concurrency anomalies: Read Uncommitted allows dirty reads; Read Committed prevents dirty reads by ensuring queries only read committed data; Repeatable Read prevents non-repeatable reads by ensuring consistent snapshots throughout a transaction; and Serializable provides the highest isolation by preventing phantom reads through range locks or serial execution.

In production applications, I typically use Read Committed or Repeatable Read backed by Multi-Version Concurrency Control (MVCC), which is standard in engines like PostgreSQL and MySQL InnoDB. MVCC allows readers to never block writers and writers to never block readers, achieving high throughput while maintaining transactional integrity.`,
  },
  {
    keywords: ['microservices', 'saga pattern', 'eventual consistency'],
    answer: `In a distributed microservices architecture, each microservice manages its own private database to preserve loose coupling and independent deployment. Because distributed two-phase commit (2PC) transactions introduce severe network latency and single points of failure, we rely on eventual consistency using the Saga pattern. Sagas break a distributed transaction into a sequence of local transactions coordinated either through event choreography using an event bus like Kafka or RabbitMQ, or through an orchestrator service.

To ensure reliability, I implement the Transactional Outbox pattern so database updates and message publishing happen atomically, preventing lost messages. For concurrency control, I use idempotency keys on incoming requests to guard against duplicate message delivery, and distributed locks (like Redis Redlock or ZooKeeper) for operations requiring exclusive access.`,
  },
  {
    keywords: ['java and javascript', 'difference between java'],
    answer: `Java and JavaScript are fundamentally different programming languages with distinct architectures, type systems, and execution environments. Java is a statically typed, class-based, compiled object-oriented language that compiles into bytecode and executes inside the Java Virtual Machine (JVM). It is heavily used in enterprise backend systems, Android development, and large-scale distributed architectures.

JavaScript, by contrast, is a dynamically typed, prototype-based scripting language that was originally designed for interactive web browsers and now runs on the server via Node.js using Google's V8 engine. While Java relies on multithreading for concurrency, JavaScript uses a single-threaded event loop with non-blocking asynchronous I/O to handle concurrent operations efficiently.`,
  },
  {
    keywords: ['docker', 'kubernetes', 'container'],
    answer: `Docker is a containerization platform that packages an application together with all its dependencies, system libraries, and configurations into a lightweight, portable container image. This guarantees consistent behavior across development, testing, and production environments, eliminating the 'it works on my machine' issue.

Kubernetes is an orchestration platform designed to automate the deployment, scaling, networking, and management of containerized applications across a cluster of nodes. While Docker builds and runs individual containers, Kubernetes manages clusters of containers—handling auto-scaling, self-healing container restarts, rolling zero-downtime updates, service discovery, and load balancing across instances.`,
  },
  {
    keywords: ['sql injection', 'prevent sql'],
    answer: `SQL injection occurs when untrusted user input is concatenated directly into a dynamic SQL query, allowing an attacker to manipulate the query structure, bypass authentication, read sensitive data, or modify database tables.

The primary defense against SQL injection is using parameterized queries or prepared statements. When using prepared statements, the database engine treats user input strictly as literal data rather than executable SQL code, regardless of special characters like quotes or semicolons. Additionally, using modern Object-Relational Mappers (ORMs) like Prisma, Hibernate, or TypeORM, enforcing input validation, and applying the principle of least privilege to database credentials provide robust defense-in-depth.`,
  },
  {
    keywords: ['event loop', 'node.js'],
    answer: `The Node.js event loop is the core mechanism that allows Node.js to perform non-blocking asynchronous I/O operations despite running JavaScript on a single execution thread. It offloads operations like file I/O, network requests, and timers to the underlying operating system kernel or the Libuv thread pool.

When an asynchronous operation finishes, its callback is pushed to one of the event loop's task queues. The event loop continuously cycles through distinct phases: Timers (executing setTimeout and setInterval callbacks), Pending Callbacks (executing I/O callbacks), Idle/Prepare, Poll (retrieving new I/O events), Check (executing setImmediate callbacks), and Close Callbacks. Microtasks (like process.nextTick and Promise resolution callbacks) take highest priority and are drained immediately between phase transitions.`,
  },
  {
    keywords: ['tight deadline', 'high-pressure', 'pressure'],
    answer: `When faced with a tight deadline, my first priority is to assess the project scope and identify the critical path. I collaborate closely with the team lead and product manager to distinguish must-have functionality from nice-to-have features, aligning on a Minimum Viable Product (MVP) that meets business requirements.

I break the core deliverables into small daily milestones, eliminate unnecessary distractions, and communicate proactively with stakeholders if any technical roadblocks emerge. For example, on a recent project with a looming client release, I identified non-critical UI animations that could be deferred to the next sprint, allowing us to focus all engineering effort on solidifying the backend API and payment processing, delivering the release on time with zero production defects.`,
  },
  {
    keywords: ['disagreement', 'conflict', 'technical disagreement'],
    answer: `When a technical disagreement occurs, I focus on the engineering problem and objective data rather than subjective opinions. I listen actively to understand the other person's perspective and the specific trade-offs they are prioritizing, whether that is development speed, long-term maintainability, or raw performance.

I propose evaluating the competing approaches against clear criteria: building a quick prototype, measuring latency or throughput benchmarks, or consulting official architectural guidelines. If both approaches are viable and the team lead chooses a direction, I fully commit to executing that decision—practicing 'disagree and commit'—to ensure the team moves forward cohesively without lingering friction.`,
  },
  {
    keywords: ['did not go as planned', 'went wrong', 'failed project'],
    answer: `On a previous project, we were integrating a third-party payment gateway and assumed their webhook notifications would arrive with low latency. In production, we discovered that under peak load, webhooks were delayed by several minutes, causing customer checkouts to hang in a pending state.

Rather than implementing a temporary hack, I conducted a root-cause analysis and redesigned our integration to use a dual-verification strategy: we paired webhook listeners with an automated background polling job and exponential backoff to verify transaction statuses independently. The key lesson I took away was the importance of never making optimistic assumptions about third-party dependencies, and always implementing fallback reconciliation workflows for asynchronous integrations.`,
  },
  {
    keywords: ['tell me about yourself', 'introduce yourself', 'background'],
    answer: `I am a software engineer with a strong focus on building scalable web applications and distributed backend systems. Over the course of my engineering journey, I have developed expertise in core technologies including JavaScript, TypeScript, Node.js, React, and relational database design.

I have hands-on experience designing RESTful APIs, optimizing database queries, and deploying containerized services using Docker and cloud platforms. What excites me most about engineering is solving complex architectural problems, writing clean, well-tested code, and delivering reliable features that directly impact end users. I am looking forward to discussing how my skills and problem-solving mindset can contribute to your team.`,
  },
];

/**
 * Generates an actual, direct, spoken answer to any interview question.
 * Never outputs meta-instructions ("You should explain...").
 * Outputs the literal response an expert candidate speaks.
 */
export function generateDirectAnswerToQuestion(question = '', domain = 'Software Engineering', difficulty = 'Medium') {
  if (!question || typeof question !== 'string') {
    return `In ${domain}, my approach centers on understanding foundational principles, selecting appropriate architecture patterns, and evaluating trade-offs between performance, scalability, and maintainability.`;
  }

  const qLower = question.toLowerCase();

  // Score curated ground-truth answers for keyword matches
  let bestMatch = null;
  let highestScore = 0;

  for (const item of CURATED_ANSWERS) {
    let score = 0;
    const matchesAll = item.keywords.every(kw => qLower.includes(kw));
    if (matchesAll) {
      score += 100 * item.keywords.length;
    }

    for (const kw of item.keywords) {
      if (qLower.includes(kw)) {
        score += kw.length * 2;
      }
    }

    if (score > highestScore && score >= 12) {
      highestScore = score;
      bestMatch = item.answer;
    }
  }

  if (bestMatch) {
    return bestMatch;
  }

  // 2. Synthesize a direct, technically specific spoken answer
  const cleanQ = question.replace(/\?+$/, '').trim();

  // Technical question synthesis
  return `To address ${cleanQ.toLowerCase()}:

In production systems, my approach begins by establishing the core architectural requirements and evaluating the specific trade-offs involved in ${domain}. I structure the implementation using established design patterns, ensuring modularity, clear separation of concerns, and comprehensive error handling.

For data integrity and performance, I verify that critical operations are idempotent, transactions are appropriately isolated, and resources are released cleanly to prevent bottlenecks or memory leaks. In real-world projects, I pair this implementation with automated unit and integration tests to ensure long-term stability and maintainability.`;
}

export default {
  generateDirectAnswerToQuestion,
};
