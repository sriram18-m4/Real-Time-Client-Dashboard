import bcrypt from 'bcrypt';
import { Role, TaskStatus, TaskPriority, ActivityType, NotificationType } from '@prisma/client';

export interface MemoryUser {
  id: string;
  email: string;
  name: string;
  passwordHash: string;
  role: Role;
  isActive: boolean;
  lastSeenAt: Date;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemoryClient {
  id: string;
  name: string;
  email: string;
  company: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemoryProject {
  id: string;
  name: string;
  description: string | null;
  clientId: string;
  createdById: string;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemoryTask {
  id: number;
  projectId: string;
  assigneeId: string | null;
  title: string;
  description: string | null;
  status: TaskStatus;
  priority: TaskPriority;
  dueDate: Date;
  isOverdue: boolean;
  overdueAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
}

export interface MemoryTaskActivity {
  id: string;
  taskId: number;
  projectId: string;
  actorId: string | null;
  type: ActivityType;
  fromStatus: TaskStatus | null;
  toStatus: TaskStatus | null;
  message: string | null;
  createdAt: Date;
}

export interface MemoryNotification {
  id: string;
  userId: string;
  taskId: number | null;
  title: string;
  message: string;
  type: NotificationType;
  isRead: boolean;
  createdAt: Date;
}

export interface MemoryRefreshToken {
  id: string;
  userId: string;
  tokenHash: string;
  expiresAt: Date;
  isRevoked: boolean;
  createdAt: Date;
  updatedAt: Date;
}

class MemoryDatabase {
  public users: MemoryUser[] = [];
  public clients: MemoryClient[] = [];
  public projects: MemoryProject[] = [];
  public tasks: MemoryTask[] = [];
  public activities: MemoryTaskActivity[] = [];
  public notifications: MemoryNotification[] = [];
  public refreshTokens: MemoryRefreshToken[] = [];
  private taskAutoIncrement = 19;
  private initialized = false;

  constructor() {
    this.seedInitial();
  }

  public getNextTaskId(): number {
    return this.taskAutoIncrement++;
  }

  public seedIfEmpty(): void {
    this.seedInitial();
  }

  public seedInitial(): void {
    if (this.initialized) return;
    this.initialized = true;

    const hash = bcrypt.hashSync('Password123!', 10);
    const now = new Date();
    const pastThreeDays = new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000);
    const pastOneWeek = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const futureTwoDays = new Date(now.getTime() + 2 * 24 * 60 * 60 * 1000);
    const futureFiveDays = new Date(now.getTime() + 5 * 24 * 60 * 60 * 1000);
    const futureTwoWeeks = new Date(now.getTime() + 14 * 24 * 60 * 60 * 1000);

    // 1. Users
    this.users = [
      {
        id: 'usr-admin-01',
        email: 'admin@agency.com',
        name: 'Alexandra Vance (Admin)',
        passwordHash: hash,
        role: Role.ADMIN,
        isActive: true,
        lastSeenAt: now,
        createdAt: pastOneWeek,
        updatedAt: now,
      },
      {
        id: 'usr-pm-01',
        email: 'pm1@agency.com',
        name: 'Marcus Chen (PM 1)',
        passwordHash: hash,
        role: Role.PROJECT_MANAGER,
        isActive: true,
        lastSeenAt: now,
        createdAt: pastOneWeek,
        updatedAt: now,
      },
      {
        id: 'usr-pm-02',
        email: 'pm2@agency.com',
        name: 'Sarah Jenkins (PM 2)',
        passwordHash: hash,
        role: Role.PROJECT_MANAGER,
        isActive: true,
        lastSeenAt: now,
        createdAt: pastOneWeek,
        updatedAt: now,
      },
      {
        id: 'usr-dev-01',
        email: 'dev1@agency.com',
        name: 'Ravi Patel (Dev 1)',
        passwordHash: hash,
        role: Role.DEVELOPER,
        isActive: true,
        lastSeenAt: now,
        createdAt: pastOneWeek,
        updatedAt: now,
      },
      {
        id: 'usr-dev-02',
        email: 'dev2@agency.com',
        name: 'Elena Rostova (Dev 2)',
        passwordHash: hash,
        role: Role.DEVELOPER,
        isActive: true,
        lastSeenAt: now,
        createdAt: pastOneWeek,
        updatedAt: now,
      },
      {
        id: 'usr-dev-03',
        email: 'dev3@agency.com',
        name: 'Liam O\'Connor (Dev 3)',
        passwordHash: hash,
        role: Role.DEVELOPER,
        isActive: true,
        lastSeenAt: now,
        createdAt: pastOneWeek,
        updatedAt: now,
      },
      {
        id: 'usr-dev-04',
        email: 'dev4@agency.com',
        name: 'Amina Diallo (Dev 4)',
        passwordHash: hash,
        role: Role.DEVELOPER,
        isActive: true,
        lastSeenAt: now,
        createdAt: pastOneWeek,
        updatedAt: now,
      },
    ];

    // 2. Clients
    this.clients = [
      {
        id: 'cli-01',
        name: 'Acme Global Innovations',
        email: 'contact@acmeglobal.io',
        company: 'Acme Corp',
        createdAt: pastOneWeek,
        updatedAt: pastOneWeek,
      },
      {
        id: 'cli-02',
        name: 'Apex Health Systems',
        email: 'procurement@apexhealth.org',
        company: 'Apex Health Group',
        createdAt: pastOneWeek,
        updatedAt: pastOneWeek,
      },
      {
        id: 'cli-03',
        name: 'Quantum Logistics',
        email: 'ops@quantumlogistics.net',
        company: 'Quantum Freight Ltd',
        createdAt: pastOneWeek,
        updatedAt: pastOneWeek,
      },
    ];

    // 3. Projects
    this.projects = [
      {
        id: 'prj-01',
        name: 'Acme Enterprise Portal Redesign',
        description: 'Customer self-service portal revamp with modern microfrontends and SSO integration.',
        clientId: 'cli-01',
        createdById: 'usr-pm-01',
        createdAt: pastOneWeek,
        updatedAt: pastOneWeek,
      },
      {
        id: 'prj-02',
        name: 'Apex Patient Telehealth Mobile App',
        description: 'HIPAA-compliant mobile application with video consultations and biometric auth.',
        clientId: 'cli-02',
        createdById: 'usr-pm-01',
        createdAt: pastOneWeek,
        updatedAt: pastOneWeek,
      },
      {
        id: 'prj-03',
        name: 'Quantum Real-time Fleet Telemetry',
        description: 'High-throughput tracking system processing IoT sensor streams from 5,000 transit vehicles.',
        clientId: 'cli-03',
        createdById: 'usr-pm-02',
        createdAt: pastOneWeek,
        updatedAt: pastOneWeek,
      },
    ];

    // 4. Tasks (18 tasks, 3 overdue)
    this.tasks = [
      {
        id: 1,
        projectId: 'prj-01',
        assigneeId: 'usr-dev-01',
        title: 'Design high-converting OAuth2 SSO flow',
        description: 'Implement secure PKCE flow with session cookie rotation and CSRF protection.',
        status: TaskStatus.DONE,
        priority: TaskPriority.HIGH,
        dueDate: pastThreeDays,
        isOverdue: false,
        overdueAt: null,
        createdAt: pastOneWeek,
        updatedAt: pastThreeDays,
      },
      {
        id: 2,
        projectId: 'prj-01',
        assigneeId: 'usr-dev-01',
        title: 'Fix edge case in token refresh race condition',
        description: 'Implement single-flight promise locking in axios interceptor when multiple requests fail 401 simultaneously.',
        status: TaskStatus.IN_REVIEW,
        priority: TaskPriority.CRITICAL,
        dueDate: pastThreeDays,
        isOverdue: true,
        overdueAt: pastThreeDays,
        createdAt: pastOneWeek,
        updatedAt: pastThreeDays,
      },
      {
        id: 3,
        projectId: 'prj-01',
        assigneeId: 'usr-dev-02',
        title: 'Migrate legacy CSS stylesheets to Tailwind CSS v4',
        description: 'Refactor components into modern utility patterns while maintaining WCAG AA contrast compliance.',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.MEDIUM,
        dueDate: futureTwoDays,
        isOverdue: false,
        overdueAt: null,
        createdAt: pastOneWeek,
        updatedAt: now,
      },
      {
        id: 4,
        projectId: 'prj-01',
        assigneeId: 'usr-dev-02',
        title: 'Implement accessible data grid with virtualized scrolling',
        description: 'Build virtualization support for tables displaying 10,000+ client billing records.',
        status: TaskStatus.TODO,
        priority: TaskPriority.LOW,
        dueDate: futureTwoWeeks,
        isOverdue: false,
        overdueAt: null,
        createdAt: pastOneWeek,
        updatedAt: pastOneWeek,
      },
      {
        id: 5,
        projectId: 'prj-01',
        assigneeId: 'usr-dev-03',
        title: 'Audit and enforce RBAC permission gates in API gateway',
        description: 'Verify 403 Forbidden on role mismatch and 404 Not Found on cross-tenant resource queries.',
        status: TaskStatus.TODO,
        priority: TaskPriority.HIGH,
        dueDate: futureFiveDays,
        isOverdue: false,
        overdueAt: null,
        createdAt: pastOneWeek,
        updatedAt: pastOneWeek,
      },
      {
        id: 6,
        projectId: 'prj-01',
        assigneeId: 'usr-dev-04',
        title: 'Configure automated Lighthouse CI regression checks',
        description: 'Set performance and accessibility budget gates in GitHub Actions workflow.',
        status: TaskStatus.DONE,
        priority: TaskPriority.MEDIUM,
        dueDate: pastOneWeek,
        isOverdue: false,
        overdueAt: null,
        createdAt: pastOneWeek,
        updatedAt: pastOneWeek,
      },

      // Project 2
      {
        id: 7,
        projectId: 'prj-02',
        assigneeId: 'usr-dev-01',
        title: 'Implement WebRTC signaling over secure WebSocket',
        description: 'Zero-ice-leak signaling server with token validation and strict room isolation.',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.CRITICAL,
        dueDate: futureTwoDays,
        isOverdue: false,
        overdueAt: null,
        createdAt: pastOneWeek,
        updatedAt: now,
      },
      {
        id: 8,
        projectId: 'prj-02',
        assigneeId: 'usr-dev-02',
        title: 'Audit patient EHR export for HIPAA encryption standards',
        description: 'Ensure AES-256 GCM encryption on PDF exports containing medical history.',
        status: TaskStatus.IN_REVIEW,
        priority: TaskPriority.HIGH,
        dueDate: pastOneWeek,
        isOverdue: true,
        overdueAt: pastOneWeek,
        createdAt: pastOneWeek,
        updatedAt: pastOneWeek,
      },
      {
        id: 9,
        projectId: 'prj-02',
        assigneeId: 'usr-dev-03',
        title: 'Biometric FaceID/TouchID unlock fallback for mobile',
        description: 'Authenticate local device hardware credentials before decrypting cached session keys.',
        status: TaskStatus.TODO,
        priority: TaskPriority.MEDIUM,
        dueDate: futureFiveDays,
        isOverdue: false,
        overdueAt: null,
        createdAt: pastOneWeek,
        updatedAt: pastOneWeek,
      },
      {
        id: 10,
        projectId: 'prj-02',
        assigneeId: 'usr-dev-04',
        title: 'Develop emergency prescription refill push notifications',
        description: 'Instant notification dispatch via Firebase Cloud Messaging and Web Push API.',
        status: TaskStatus.TODO,
        priority: TaskPriority.HIGH,
        dueDate: futureTwoWeeks,
        isOverdue: false,
        overdueAt: null,
        createdAt: pastOneWeek,
        updatedAt: pastOneWeek,
      },
      {
        id: 11,
        projectId: 'prj-02',
        assigneeId: 'usr-dev-01',
        title: 'Create doctor appointment slot availability calendar',
        description: 'Interactive timezone-aware schedule picker with real-time slot locking.',
        status: TaskStatus.DONE,
        priority: TaskPriority.MEDIUM,
        dueDate: pastThreeDays,
        isOverdue: false,
        overdueAt: null,
        createdAt: pastOneWeek,
        updatedAt: pastThreeDays,
      },
      {
        id: 12,
        projectId: 'prj-02',
        assigneeId: 'usr-dev-03',
        title: 'Add audio-only fallback mode when bandwidth drops below 150kbps',
        description: 'Dynamic bitrate throttling and adaptive video track muting in bad network states.',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.LOW,
        dueDate: futureTwoDays,
        isOverdue: false,
        overdueAt: null,
        createdAt: pastOneWeek,
        updatedAt: now,
      },

      // Project 3
      {
        id: 13,
        projectId: 'prj-03',
        assigneeId: 'usr-dev-04',
        title: 'Ingest MQTT sensor streams into Timescale hypertable',
        description: 'Process 10k messages/second from OBD-II vehicle dongles with zero backpressure drops.',
        status: TaskStatus.DONE,
        priority: TaskPriority.CRITICAL,
        dueDate: pastThreeDays,
        isOverdue: false,
        overdueAt: null,
        createdAt: pastOneWeek,
        updatedAt: pastThreeDays,
      },
      {
        id: 14,
        projectId: 'prj-03',
        assigneeId: 'usr-dev-03',
        title: 'Real-time geofence violation alerting microservice',
        description: 'Evaluate polygon boundary coordinates in memory using geospatial index.',
        status: TaskStatus.IN_PROGRESS,
        priority: TaskPriority.HIGH,
        dueDate: futureTwoDays,
        isOverdue: false,
        overdueAt: null,
        createdAt: pastOneWeek,
        updatedAt: now,
      },
      {
        id: 15,
        projectId: 'prj-03',
        assigneeId: 'usr-dev-02',
        title: 'Fleet driver fuel efficiency rating algorithm',
        description: 'Aggregate idle time, hard braking events, and rapid acceleration into weekly scorecards.',
        status: TaskStatus.IN_REVIEW,
        priority: TaskPriority.MEDIUM,
        dueDate: futureFiveDays,
        isOverdue: false,
        overdueAt: null,
        createdAt: pastOneWeek,
        updatedAt: now,
      },
      {
        id: 16,
        projectId: 'prj-03',
        assigneeId: 'usr-dev-01',
        title: 'Driver ELD logbook compliance compliance export',
        description: 'Generate FMCSA standard HOS (Hours of Service) certified logbook PDFs.',
        status: TaskStatus.TODO,
        priority: TaskPriority.HIGH,
        dueDate: pastThreeDays,
        isOverdue: true,
        overdueAt: pastThreeDays,
        createdAt: pastOneWeek,
        updatedAt: pastThreeDays,
      },
      {
        id: 17,
        projectId: 'prj-03',
        assigneeId: 'usr-dev-04',
        title: 'Build canvas map overlay for live fleet locations',
        description: 'High performance WebGL marker clustering with 60fps movement interpolation.',
        status: TaskStatus.TODO,
        priority: TaskPriority.LOW,
        dueDate: futureTwoWeeks,
        isOverdue: false,
        overdueAt: null,
        createdAt: pastOneWeek,
        updatedAt: pastOneWeek,
      },
      {
        id: 18,
        projectId: 'prj-03',
        assigneeId: 'usr-dev-02',
        title: 'Tire pressure threshold alert webhook for dispatchers',
        description: 'Trigger automated SMS alerts to dispatchers when tire PSI falls below tolerance.',
        status: TaskStatus.TODO,
        priority: TaskPriority.MEDIUM,
        dueDate: futureFiveDays,
        isOverdue: false,
        overdueAt: null,
        createdAt: pastOneWeek,
        updatedAt: pastOneWeek,
      },
    ];

    // 5. Activities (26 rows)
    this.activities = [
      {
        id: 'act-01',
        taskId: 1,
        projectId: 'prj-01',
        actorId: 'usr-pm-01',
        type: ActivityType.CREATED,
        fromStatus: null,
        toStatus: TaskStatus.TODO,
        message: 'Marcus Chen created Task #1',
        createdAt: new Date(now.getTime() - 10 * 24 * 60 * 60 * 1000),
      },
      {
        id: 'act-02',
        taskId: 1,
        projectId: 'prj-01',
        actorId: 'usr-pm-01',
        type: ActivityType.ASSIGNED,
        fromStatus: null,
        toStatus: null,
        message: 'Marcus Chen assigned Task #1 to Ravi Patel',
        createdAt: new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000),
      },
      {
        id: 'act-03',
        taskId: 1,
        projectId: 'prj-01',
        actorId: 'usr-dev-01',
        type: ActivityType.STATUS_CHANGED,
        fromStatus: TaskStatus.TODO,
        toStatus: TaskStatus.IN_PROGRESS,
        message: 'Ravi Patel moved Task #1 from Todo → In Progress',
        createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      },
      {
        id: 'act-04',
        taskId: 1,
        projectId: 'prj-01',
        actorId: 'usr-dev-01',
        type: ActivityType.STATUS_CHANGED,
        fromStatus: TaskStatus.IN_PROGRESS,
        toStatus: TaskStatus.IN_REVIEW,
        message: 'Ravi Patel moved Task #1 from In Progress → In Review',
        createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      },
      {
        id: 'act-05',
        taskId: 1,
        projectId: 'prj-01',
        actorId: 'usr-pm-01',
        type: ActivityType.STATUS_CHANGED,
        fromStatus: TaskStatus.IN_REVIEW,
        toStatus: TaskStatus.DONE,
        message: 'Marcus Chen moved Task #1 from In Review → Done',
        createdAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
      },
      {
        id: 'act-06',
        taskId: 2,
        projectId: 'prj-01',
        actorId: 'usr-pm-01',
        type: ActivityType.CREATED,
        fromStatus: null,
        toStatus: TaskStatus.TODO,
        message: 'Marcus Chen created Task #2',
        createdAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000),
      },
      {
        id: 'act-07',
        taskId: 2,
        projectId: 'prj-01',
        actorId: 'usr-dev-01',
        type: ActivityType.STATUS_CHANGED,
        fromStatus: TaskStatus.TODO,
        toStatus: TaskStatus.IN_PROGRESS,
        message: 'Ravi Patel moved Task #2 from Todo → In Progress',
        createdAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
      },
      {
        id: 'act-08',
        taskId: 2,
        projectId: 'prj-01',
        actorId: 'usr-dev-01',
        type: ActivityType.STATUS_CHANGED,
        fromStatus: TaskStatus.IN_PROGRESS,
        toStatus: TaskStatus.IN_REVIEW,
        message: 'Ravi Patel moved Task #2 from In Progress → In Review',
        createdAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
      },
      {
        id: 'act-09',
        taskId: 2,
        projectId: 'prj-01',
        actorId: null,
        type: ActivityType.OVERDUE_FLAGGED,
        fromStatus: null,
        toStatus: null,
        message: 'System flagged Task #2 as Overdue (past deadline)',
        createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      },
      {
        id: 'act-10',
        taskId: 3,
        projectId: 'prj-01',
        actorId: 'usr-pm-01',
        type: ActivityType.CREATED,
        fromStatus: null,
        toStatus: TaskStatus.TODO,
        message: 'Marcus Chen created Task #3',
        createdAt: new Date(now.getTime() - 4 * 24 * 60 * 60 * 1000),
      },
      {
        id: 'act-11',
        taskId: 3,
        projectId: 'prj-01',
        actorId: 'usr-dev-02',
        type: ActivityType.STATUS_CHANGED,
        fromStatus: TaskStatus.TODO,
        toStatus: TaskStatus.IN_PROGRESS,
        message: 'Elena Rostova moved Task #3 from Todo → In Progress',
        createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        id: 'act-12',
        taskId: 6,
        projectId: 'prj-01',
        actorId: 'usr-dev-04',
        type: ActivityType.STATUS_CHANGED,
        fromStatus: TaskStatus.IN_REVIEW,
        toStatus: TaskStatus.DONE,
        message: 'Amina Diallo moved Task #6 from In Review → Done',
        createdAt: new Date(now.getTime() - 6 * 24 * 60 * 60 * 1000),
      },
      {
        id: 'act-13',
        taskId: 7,
        projectId: 'prj-02',
        actorId: 'usr-pm-01',
        type: ActivityType.CREATED,
        fromStatus: null,
        toStatus: TaskStatus.TODO,
        message: 'Marcus Chen created Task #7',
        createdAt: new Date(now.getTime() - 5 * 24 * 60 * 60 * 1000),
      },
      {
        id: 'act-14',
        taskId: 7,
        projectId: 'prj-02',
        actorId: 'usr-dev-01',
        type: ActivityType.STATUS_CHANGED,
        fromStatus: TaskStatus.TODO,
        toStatus: TaskStatus.IN_PROGRESS,
        message: 'Ravi Patel moved Task #7 from Todo → In Progress',
        createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        id: 'act-15',
        taskId: 8,
        projectId: 'prj-02',
        actorId: 'usr-dev-02',
        type: ActivityType.STATUS_CHANGED,
        fromStatus: TaskStatus.IN_PROGRESS,
        toStatus: TaskStatus.IN_REVIEW,
        message: 'Elena Rostova moved Task #8 from In Progress → In Review',
        createdAt: new Date(now.getTime() - 8 * 24 * 60 * 60 * 1000),
      },
      {
        id: 'act-16',
        taskId: 8,
        projectId: 'prj-02',
        actorId: null,
        type: ActivityType.OVERDUE_FLAGGED,
        fromStatus: null,
        toStatus: null,
        message: 'System flagged Task #8 as Overdue (past deadline)',
        createdAt: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
      },
      {
        id: 'act-17',
        taskId: 11,
        projectId: 'prj-02',
        actorId: 'usr-dev-01',
        type: ActivityType.STATUS_CHANGED,
        fromStatus: TaskStatus.IN_REVIEW,
        toStatus: TaskStatus.DONE,
        message: 'Ravi Patel moved Task #11 from In Review → Done',
        createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      },
      {
        id: 'act-18',
        taskId: 12,
        projectId: 'prj-02',
        actorId: 'usr-dev-03',
        type: ActivityType.STATUS_CHANGED,
        fromStatus: TaskStatus.TODO,
        toStatus: TaskStatus.IN_PROGRESS,
        message: 'Liam O\'Connor moved Task #12 from Todo → In Progress',
        createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      },
      {
        id: 'act-19',
        taskId: 13,
        projectId: 'prj-03',
        actorId: 'usr-pm-02',
        type: ActivityType.CREATED,
        fromStatus: null,
        toStatus: TaskStatus.TODO,
        message: 'Sarah Jenkins created Task #13',
        createdAt: new Date(now.getTime() - 9 * 24 * 60 * 60 * 1000),
      },
      {
        id: 'act-20',
        taskId: 13,
        projectId: 'prj-03',
        actorId: 'usr-dev-04',
        type: ActivityType.STATUS_CHANGED,
        fromStatus: TaskStatus.IN_PROGRESS,
        toStatus: TaskStatus.DONE,
        message: 'Amina Diallo moved Task #13 from In Progress → Done',
        createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      },
      {
        id: 'act-21',
        taskId: 14,
        projectId: 'prj-03',
        actorId: 'usr-dev-03',
        type: ActivityType.STATUS_CHANGED,
        fromStatus: TaskStatus.TODO,
        toStatus: TaskStatus.IN_PROGRESS,
        message: 'Liam O\'Connor moved Task #14 from Todo → In Progress',
        createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        id: 'act-22',
        taskId: 15,
        projectId: 'prj-03',
        actorId: 'usr-dev-02',
        type: ActivityType.STATUS_CHANGED,
        fromStatus: TaskStatus.IN_PROGRESS,
        toStatus: TaskStatus.IN_REVIEW,
        message: 'Elena Rostova moved Task #15 from In Progress → In Review',
        createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      },
      {
        id: 'act-23',
        taskId: 16,
        projectId: 'prj-03',
        actorId: null,
        type: ActivityType.OVERDUE_FLAGGED,
        fromStatus: null,
        toStatus: null,
        message: 'System flagged Task #16 as Overdue (past deadline)',
        createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      },
      {
        id: 'act-24',
        taskId: 17,
        projectId: 'prj-03',
        actorId: 'usr-pm-02',
        type: ActivityType.CREATED,
        fromStatus: null,
        toStatus: TaskStatus.TODO,
        message: 'Sarah Jenkins created Task #17',
        createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        id: 'act-25',
        taskId: 18,
        projectId: 'prj-03',
        actorId: 'usr-pm-02',
        type: ActivityType.CREATED,
        fromStatus: null,
        toStatus: TaskStatus.TODO,
        message: 'Sarah Jenkins created Task #18',
        createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      },
      {
        id: 'act-26',
        taskId: 2,
        projectId: 'prj-01',
        actorId: 'usr-dev-01',
        type: ActivityType.STATUS_CHANGED,
        fromStatus: TaskStatus.IN_PROGRESS,
        toStatus: TaskStatus.IN_REVIEW,
        message: 'Ravi Patel moved Task #2 from In Progress → In Review',
        createdAt: new Date(now.getTime() - 15 * 60 * 1000),
      },
    ];

    // 6. Notifications
    this.notifications = [
      {
        id: 'notif-01',
        userId: 'usr-dev-01',
        taskId: 2,
        title: 'Task Overdue Alert',
        message: 'Task #2 "Fix edge case in token refresh race condition" is overdue.',
        type: NotificationType.TASK_OVERDUE,
        isRead: false,
        createdAt: new Date(now.getTime() - 3 * 24 * 60 * 60 * 1000),
      },
      {
        id: 'notif-02',
        userId: 'usr-pm-01',
        taskId: 2,
        title: 'Task In Review',
        message: 'Ravi Patel moved Task #2 to IN_REVIEW for Acme Enterprise Portal.',
        type: NotificationType.TASK_IN_REVIEW,
        isRead: false,
        createdAt: new Date(now.getTime() - 15 * 60 * 1000),
      },
      {
        id: 'notif-03',
        userId: 'usr-dev-02',
        taskId: 3,
        title: 'New Task Assigned',
        message: 'You were assigned to Task #3 "Migrate legacy CSS stylesheets to Tailwind CSS v4".',
        type: NotificationType.TASK_ASSIGNED,
        isRead: true,
        createdAt: new Date(now.getTime() - 2 * 24 * 60 * 60 * 1000),
      },
      {
        id: 'notif-04',
        userId: 'usr-pm-02',
        taskId: 15,
        title: 'Task In Review',
        message: 'Elena Rostova moved Task #15 to IN_REVIEW for Quantum Fleet Telemetry.',
        type: NotificationType.TASK_IN_REVIEW,
        isRead: false,
        createdAt: new Date(now.getTime() - 1 * 24 * 60 * 60 * 1000),
      },
    ];
  }
}

export const memoryDb = new MemoryDatabase();
