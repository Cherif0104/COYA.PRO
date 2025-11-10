import { Course, Job, Project, Task, Contact, Document, Objective, TimeLog, Invoice, Expense, RecurringInvoice, RecurringExpense, Budget, Meeting } from '../types';

// Note: Les utilisateurs mockés ont été supprimés. Tous les utilisateurs sont maintenant gérés via Supabase.

export const mockCourses: Course[] = [
  { 
    id: 1, 
    title: "Digital Marketing Fundamentals", 
    instructor: "Khadija Sow", 
    duration: "6 Weeks", 
    progress: 75, 
    icon: "fas fa-bullhorn",
    description: "Learn the core concepts of digital marketing, from social media and content strategy to SEO and email campaigns. This course is perfect for aspiring marketers and entrepreneurs.",
    modules: [
      { id: "m1-1", title: "Week 1: Introduction to Digital Marketing", lessons: [
        { id: "l1-1-1", title: "The Digital Landscape", type: "video", duration: "15 min", icon: "fas fa-play-circle" },
        { id: "l1-1-2", title: "Key Terminology", type: "reading", duration: "20 min", icon: "fas fa-book-open" },
      ],
      evidenceDocuments: [
          { fileName: 'market-analysis.pdf', dataUrl: 'data:application/pdf;base64,JVBERi0xLjQKJ...' }
      ]
      },
      { id: "m1-2", title: "Week 2: Content Strategy", lessons: [
        { id: "l1-2-1", title: "Creating a Content Calendar", type: "video", duration: "25 min", icon: "fas fa-play-circle" },
        { id: "l1-2-2", title: "Quiz: Content Fundamentals", type: "quiz", duration: "10 min", icon: "fas fa-question-circle" },
      ]}
    ]
  },
  { 
    id: 2, 
    title: "Entrepreneurship 101", 
    instructor: "Babacar Cissé", 
    duration: "8 Weeks", 
    progress: 40, 
    icon: "fas fa-lightbulb",
    description: "From idea to execution, this course covers the essential steps to starting and growing a successful business in the West African context. Learn about business planning, fundraising, and market analysis.",
    modules: [
        { id: "m2-1", title: "Module 1: Ideation & Validation", lessons: [
            { id: "l2-1-1", title: "Finding Your Business Idea", type: "video", duration: "30 min", icon: "fas fa-play-circle" },
            { id: "l2-1-2", title: "Market Research Techniques", type: "reading", duration: "45 min", icon: "fas fa-book-open" },
        ]},
        { id: "m2-2", title: "Module 2: Business Planning", lessons: [
            { id: "l2-2-1", title: "Crafting a Lean Canvas", type: "video", duration: "20 min", icon: "fas fa-play-circle" },
            { id: "l2-2-2", title: "Financial Projections for Startups", type: "reading", duration: "60 min", icon: "fas fa-book-open" },
            { id: "l2-2-3", title: "Quiz: Business Plan Essentials", type: "quiz", duration: "15 min", icon: "fas fa-question-circle" },
        ]}
    ]
  },
  { 
    id: 3, 
    title: "Project Management with AI", 
    instructor: "Dr. Diallo", 
    duration: "12 Weeks", 
    progress: 90, 
    icon: "fas fa-tasks",
    description: "Discover how Artificial Intelligence is revolutionizing project management. This course explores AI tools for task automation, risk prediction, and resource optimization.",
    modules: [
       { id: "m3-1", title: "Part 1: PM Fundamentals", lessons: [
         { id: "l3-1-1", title: "The Project Lifecycle", type: "video", duration: "18 min", icon: "fas fa-play-circle" },
       ]},
       { id: "m3-2", title: "Part 2: AI in Project Management", lessons: [
         { id: "l3-2-1", title: "Automating Tasks with AI", type: "video", duration: "35 min", icon: "fas fa-play-circle" },
         { id: "l3-2-2", title: "Predictive Analytics for Timelines", type: "reading", duration: "50 min", icon: "fas fa-book-open" },
       ]}
    ]
  },
  { 
    id: 4, 
    title: "Introduction to Web Development", 
    instructor: "Omar Ba", 
    duration: "10 Weeks", 
    progress: 25, 
    icon: "fas fa-code",
    description: "Build your first websites with HTML, CSS, and JavaScript. This course provides a solid foundation for anyone looking to become a web developer.",
    modules: [
      { id: "m4-1", title: "HTML & CSS Basics", lessons: [
        { id: "l4-1-1", title: "Your First Web Page", type: "video", duration: "40 min", icon: "fas fa-play-circle" }
      ]}
    ]
  },
];

export const mockJobs: Job[] = [
  { id: 1, title: "Community Manager", company: "Senegal Numerique SA", location: "Dakar, Senegal", type: "Full-time", postedDate: "2 days ago", description: "Manage our online community, create engaging content, and drive social media strategy.", requiredSkills: ["Community Management", "Social Media", "Content Creation"], applicants: [] },
  { id: 2, title: "Project Assistant (Non-Profit)", company: "SENEGEL WorkFlow Org", location: "Thiès, Senegal", type: "Part-time", postedDate: "5 days ago", description: "Assist project managers with daily tasks, reporting, and stakeholder communication in a non-profit environment.", requiredSkills: ["Project Management", "Communication", "Microsoft Office"], applicants: [] },
  { id: 3, title: "Artisan Marketplace Coordinator", company: "Artisans du Sénégal", location: "Remote", type: "Contract", postedDate: "1 week ago", description: "Coordinate with local artisans to feature their products on our e-commerce platform.", requiredSkills: ["E-commerce", "Vendor Management", "Logistics"], applicants: [] },
  { id: 4, title: "Junior Graphic Designer", company: "Wave Mobile Money", location: "Dakar, Senegal", type: "Full-time", postedDate: "3 days ago", description: "Create compelling visual assets for our marketing campaigns across various digital channels.", requiredSkills: ["Graphic Design", "Adobe Suite", "UI/UX"], applicants: [] },
];


export const mockProjects: Project[] = [
    {
        id: "1",
        title: "Lancement de la campagne marketing du quatrième trimestre",
        description: "Develop and execute a comprehensive marketing campaign for the new product line. The campaign should target young professionals and students.",
        status: "In Progress",
        dueDate: "2024-12-31",
        team: [],
        tasks: [
            { id: 't1', text: "Finalize key messaging and value proposition", status: 'Done', priority: 'High', assignee: null, estimatedTime: 8, loggedTime: 6, dueDate: '2024-10-15' },
            { id: 't2', text: "Develop social media content calendar", status: 'Done', priority: 'High', assignee: null, estimatedTime: 12, loggedTime: 15, dueDate: '2024-10-20' },
            { id: 't3', text: "Create video testimonials with beta users", status: 'In Progress', priority: 'Medium', assignee: null, estimatedTime: 16, loggedTime: 4.5, dueDate: '2024-11-05' },
            { id: 't4', text: "Organize launch webinar", status: 'To Do', priority: 'High', estimatedTime: 40, dueDate: '2024-12-01' },
        ],
        risks: []
    },
    {
        id: "2",
        title: "E-commerce Platform Upgrade",
        description: "Integrate a new payment gateway and AI-powered recommendation engine into the existing e-commerce platform to improve user experience and increase sales.",
        status: "Not Started",
        dueDate: "2025-03-15",
        team: [],
        tasks: [],
        risks: []
    },
    {
        id: "3",
        title: "AI Chatbot for Customer Support",
        description: "Design, develop, and deploy an AI-powered chatbot to assist customers with common questions about products, orders, and platform navigation.",
        status: "Completed",
        dueDate: "2024-06-01",
        team: [],
        tasks: [
             { id: 't1-p3', text: "Gather FAQ data", status: 'Done', priority: 'High', estimatedTime: 10, loggedTime: 10 },
             { id: 't2-p3', text: "Select NLP service", status: 'Done', priority: 'High', estimatedTime: 20, loggedTime: 18 },
             { id: 't3-p3', text: "Develop conversation flows", status: 'Done', priority: 'Medium', estimatedTime: 30, loggedTime: 35 },
             { id: 't4-p3', text: "Integrate with frontend", status: 'Done', priority: 'Medium', estimatedTime: 25, loggedTime: 25 },
        ],
        risks: []
    }
];

export const mockGoals: Objective[] = [
    {
        id: "okr1",
        projectId: "1",
        title: "Lancer avec succès la campagne du quatrième trimestre et obtenir une adoption rapide",
        keyResults: [
            { id: 'kr1-1', title: "Atteindre 10 000 inscriptions d'utilisateurs au cours du premier mois suivant le lancement", current: 3500, target: 10000, unit: "utilisateurs" },
            { id: 'kr1-2', title: "Sécuriser 50 partenaires B2B pour intégrer le nouveau produit", current: 5, target: 50, unit: "partenaires" },
            { id: 'kr1-3', title: "Atteindre un score de satisfaction utilisateur de 8,5/10", current: 0, target: 8.5, unit: "/10" },
        ]
    }
];

// mockContacts supprimé - Utilisation de Supabase uniquement

// mockDocuments supprimé - Utilisation de Supabase uniquement

const today = new Date();
const yesterday = new Date(today);
yesterday.setDate(yesterday.getDate() - 1);
const twoDaysAgo = new Date(today);
twoDaysAgo.setDate(twoDaysAgo.getDate() - 2);

const nextWeek = new Date();
nextWeek.setDate(today.getDate() + 7);
const dayAfter = new Date(nextWeek);
dayAfter.setDate(nextWeek.getDate() + 1);

// mockTimeLogs supprimé - Utilisez Supabase uniquement

// mockLeaveRequests supprimé - Utilisation de Supabase uniquement

// mockInvoices, mockExpenses, mockRecurringInvoices, mockRecurringExpenses, mockBudgets supprimés - Utilisation de Supabase uniquement

const getTodayAtTime = (hour: number, minute: number = 0) => {
    const d = new Date();
    d.setHours(hour, minute, 0, 0);
    return d.toISOString();
}

// mockMeetings supprimé - Utilisez Supabase uniquement
