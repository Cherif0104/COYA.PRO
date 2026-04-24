# Prompts Cursor — Finance ERP / SAP B1 / OHADA Afrique

Document de référence pour guider Cursor (ou un autre agent UI) vers une refonte **ERP-grade** du module comptabilité COYA : vues **Essentiel / Avancé / Expert**, shell type cockpit, plan comptable SYSCOHADA, puis vision produit élargie (SAP B1) et **ERP africain natif OHADA**.

---

## 1. Prompt — Rebuild ERP Finance UI (Ultra Premium SaaS)

Copier-coller dans Cursor :

```
Design and generate a premium enterprise SaaS finance ERP interface (desktop web app), inspired by SAP Business One, SAP Fiori, Oracle Fusion and modern fintech dashboards.

GOAL:
Reimagine a legacy accounting ERP screen into a modern, elegant, dense-but-usable enterprise product focused on SYSCOHADA/OHADA accounting.

STYLE:
- Ultra premium B2B SaaS
- Minimal but information rich
- Executive finance cockpit aesthetic
- Enterprise-grade UX
- Figma-ready layout
- Clean grid system (12 columns)
- Soft shadows
- Large spacing
- Rounded cards (12-16px)
- Professional typography
- Neutral background (#F6F8FB)
- White surfaces
- Accent blue for finance interactions
- Dark left navigation

APP LAYOUT:

1. TOP APP BAR
Include:
- Logo "Finance ERP"
- Global search bar
- Company selector
- Fiscal year selector
- Environment badge "SYSCOHADA"
- Notifications
- User profile dropdown
- Command palette shortcut (Ctrl+K)

2. LEFT SIDEBAR (collapsible)
Three switch modes at top:

[ Essential View ]
[ Advanced View ]
[ Expert Mode ]

Navigation tree:

Finance Dashboard
General Ledger
Chart of Accounts
Journals
Entries
Cost Centers
Budgets
Tax
Reconciliation
Matching
Reports
Period Close
Settings

Expert mode expands nested submodules.

3. MAIN DASHBOARD CONTENT

Top KPI cards:
- Cash Position
- General Balance
- Open Journal Entries
- Budget vs Actual
- Fiscal Alerts
- Closing Status

Use modern metric cards with micro charts.

4. MAIN WORKSPACE SCREEN:
Build "Chart of Accounts - OHADA"

Header:
Title:
Plan Général OHADA

Actions:
+ Add Account
Import
Export
Settings

Filters bar:
- Filter by framework: SYSCOHADA
- Checkbox:
✓ Treasury Accounts (used in cash flow)
- Search account
- Multi-filter chips

Main content:
Advanced enterprise data grid:

Columns:
Class
Account No
Label
Type
Cost Center
Budget Linked
Status

Use sticky header.
Dense but elegant grid.

Right inspector side panel on row click:
Tabs:
- Account Settings
- Mapping OHADA
- Journal History
- Cash Flow Classification
- Linked Budgets

5. ADVANCED COMPONENTS
Add:
- Cashflow chart widget
- Budget variance graph
- Cost center heatmap
- Closing process progress tracker

6. UX BEHAVIOR
Progressive disclosure:
Essential view:
simplified navigation

Advanced:
more modules

Expert:
full accounting tree

Use slide-over panels instead of modal popups.

7. VISUAL REFERENCES
Blend:
40% SAP Fiori
30% modern fintech dashboard
20% Notion-level clean UX
10% Bloomberg terminal density

8. OUTPUT
Produce:
- Full high fidelity SaaS mockup
- Design system tokens
- Figma component structure
- Desktop responsive layout
- Ready for React + Tailwind implementation

COMPONENTS TO INCLUDE:
Buttons
Tabs
Data grid
Sidebar tree
KPI widgets
Filters
Forms
Inspector drawer
Charts
Status badges
Breadcrumbs

DESIGN SYSTEM:
Typography scale
Color tokens
Spacing tokens
Table styles
Form styles
Button variants
ERP component library

Very important:
This must look like a premium enterprise software product in 2026, not generic admin template.

Generate as if designing a product between SAP + Oracle + Stripe-quality UI.

Optional executive fintech add-on:
Use a luxury financial operating system aesthetic similar to a CFO cockpit.
Think "Bloomberg meets Stripe meets SAP".
Prioritize dense professional information over consumer-style dashboards.

Dual-pane accounting workspace (optional):
Generate dual-pane accounting workspace:
left = ledger explorer
center = journal workspace
right = contextual inspector
```

### Structure Figma suggérée

- **Pages :** Foundations, Design System, Navigation, Finance Dashboard, Chart of Accounts, Journals, Entries, Budgeting, Fiscal/Tax, Expert Mode Screens, Prototypes  
- **Composants :** Sidebar/Nav, ERP Data Grid, Accounting Forms, OHADA Components, KPI Cards, Closing Wizard, Reconciliation Workspace  

---

## 2. Master prompt — SAP Business One modernisé (module par module)

```
Act as a senior ERP product designer, enterprise solution architect and senior React/Tailwind front-end engineer.

GOAL:
Rebuild the full SAP Business One ecosystem as a modern premium SaaS ERP platform (2026-grade), preserving functional depth while redesigning UX/UI completely.

Design a modular enterprise operating system inspired by:
- SAP Business One
- SAP Fiori
- Oracle Fusion
- Microsoft Dynamics 365
- Odoo Enterprise
- Workday
- Stripe-quality UI

Style:
- Ultra premium enterprise SaaS
- Dense but elegant
- High productivity UI
- CFO / COO cockpit aesthetic
- Figma-ready
- React + Tailwind component architecture
- Modern design system
- Multi-company
- Role-based UI
- Progressive disclosure

====================================
GLOBAL APP SHELL
====================================

Create:

1 Global topbar:
- Global search
- Command palette
- Notifications
- Tasks inbox
- Company selector
- Entity selector
- Fiscal year selector
- User menu
- Environment badges

2 Collapsible intelligent sidebar:
Navigation by business domains.

3 Three UX levels:
- Essential View
- Advanced View
- Expert Mode

4 Workspace pattern:
- List + Detail
- Split pane
- Data grids
- Inspector side panels
- Wizard flows
- Dashboards
- Kanban where relevant

====================================
MODULES TO DESIGN
====================================

Design each module as a full modern product module.

-----------------------------------
1. FINANCE / ACCOUNTING
-----------------------------------

Modules:
Dashboard
General Ledger
Chart of Accounts
Journals
Journal Entries
Accounts Payable
Accounts Receivable
Banking
Reconciliation
Cost Centers
Budgets
Fixed Assets
Tax
Period Closing
Financial Reports
OHADA / SYSCOHADA framework support

Include:
- Finance cockpit
- Multi-ledger workspace
- Journal workbench
- Closing center
- Treasury dashboard

-----------------------------------
2. SALES CRM
-----------------------------------

Lead management
Opportunities
Quotes
Sales Orders
Contracts
Pricing
Customer 360
Pipeline dashboard

Include:
- CRM pipeline boards
- Customer intelligence views
- Sales cockpit

-----------------------------------
3. PURCHASING / PROCUREMENT
-----------------------------------

Vendors
Purchase Requests
Purchase Orders
Approvals
Supplier Portal
Spend analysis

Build procurement command center.

-----------------------------------
4. INVENTORY / WAREHOUSE
-----------------------------------

Inventory control
Warehouses
Transfers
Stock valuation
Serial numbers
Batch management
Picking/Packing
Cycle counts

Create warehouse operations cockpit.

-----------------------------------
5. MANUFACTURING / MRP
-----------------------------------

Bills of Materials
Production Orders
MRP Planning
Capacity Planning
Shop Floor Control

Create production planning workspace.

-----------------------------------
6. PROJECT MANAGEMENT
-----------------------------------

Projects
Tasks
Budgets
Time tracking
Resource planning

-----------------------------------
7. HR / WORKFORCE
-----------------------------------

Employees
Time & Attendance
Payroll
Leave
Org charts
Performance

-----------------------------------
8. SERVICE MANAGEMENT
-----------------------------------

Service tickets
SLAs
Customer support
Field service
Maintenance

-----------------------------------
9. REPORTING / BI
-----------------------------------

Executive dashboards
KPI center
Financial analytics
Operational analytics
Custom reports
Embedded BI

Build analytics control tower.

-----------------------------------
10. ADMINISTRATION
-----------------------------------

Users
Roles
Authorizations
Workflow engine
Approval rules
Configuration
Audit logs
Localization

Build admin control center.

====================================
UI PATTERNS
====================================

Use:
- enterprise data grids
- advanced filters
- command center dashboards
- slide-over drawers
- inspector panels
- wizard flows
- tabbed workspaces
- modular cards
- KPI widgets
- process timelines

Avoid generic admin template look.

====================================
DESIGN SYSTEM
====================================

Generate full design system:

Colors
Typography
Spacing
Grid
Tables
Forms
Buttons
ERP component library
Charts
Status badges
Tree components
ERP icons

Support:
Light and dark mode.

====================================
SPECIAL ERP FEATURES
====================================

Include:
- Workflow approvals
- Alerts center
- Activity feed
- AI assistant panel
- Universal search
- Saved views
- Personal dashboards
- Multi-entity support
- Audit trail
- Embedded analytics

====================================
OUTPUT
====================================

Produce:

For EACH module:
1 high fidelity mockup
1 desktop layout
1 mobile responsive concept
Component structure
Screen architecture
Figma structure
React/Tailwind structure

Also generate:
- ERP information architecture
- Module map
- Navigation map
- UX flows
- Enterprise design system
- Product-level wireframes

Important:
Do NOT generate simple admin dashboards.
Generate a true next-generation enterprise operating system replacing SAP Business One.
Think premium ERP product built in 2026.
```

### Sous-prompts « deep dive » (exemples)

- **Finance :** *Expand only the Finance module and redesign SAP Business One Financials as a premium treasury and accounting operating system.*  
- **MRP :** *Rebuild SAP Business One MRP as a modern manufacturing planning cockpit.*  
- **Inventory :** *Design warehouse and inventory control like a fusion of SAP EWM + modern SaaS WMS.*  

### Architecture cible (rappel)

```
Core ERP
├── Finance
├── Sales
├── Procurement
├── Inventory
├── Manufacturing
├── Projects
├── HR
├── Service
├── BI
└── Administration
```

---

## 3. Master prompt — ERP africain natif OHADA (SAP + Odoo + Fusion)

```
Act as:
- Senior ERP product architect
- Enterprise software UX strategist
- African digital transformation consultant
- Senior React/Tailwind engineer
- Fintech and accounting domain expert

GOAL:
Design a next-generation cloud ERP platform native for Africa, combining:
- SAP Business One depth
- Odoo modular flexibility
- Oracle Fusion enterprise sophistication

Build a premium SaaS ERP specifically designed for:
- OHADA / SYSCOHADA accounting
- African enterprises
- Governments
- NGOs
- SMEs to large enterprises
- Multi-country African operations

This is not a generic ERP.
This should feel like the future African enterprise operating system.

==================================================
PRODUCT NAME CONCEPT
==================================================

Generate the product as a full digital operating system:
"AfricaOS ERP"

Possible branding inspiration:
- Pan-African enterprise software
- Sovereign digital infrastructure
- Modern public/private sector ERP

==================================================
DESIGN PRINCIPLES
==================================================

Design philosophy:
- Enterprise-grade but intuitive
- African-first, not western ERP localized later
- Premium SaaS product
- High information density with elegant UX
- Mobile + desktop + low-bandwidth considerations
- Offline capable modules where relevant
- Multi-language:
French
English
Portuguese
Arabic

Visual inspiration:
40% Oracle Fusion
25% SAP Fiori
20% Odoo Enterprise
15% African fintech aesthetic

Use:
- Premium dashboards
- Command center UX
- Split-pane workspaces
- Dense but beautiful data grids
- Workflow-first interfaces

==================================================
CORE MODULES
==================================================

1. Finance & OHADA Core
Build native OHADA accounting engine:

Modules:
- Plan Comptable SYSCOHADA
- OHADA account classes 1-8
- General Ledger
- Journals
- Entries
- Lettrage
- Bank Reconciliation
- Budgeting
- Cost Centers
- Fixed Assets
- Fiscal declarations
- Closing center
- Treasury management
- Cash flow statements
- OHADA financial statements automation

Special native features:
- OHADA compliance engine
- SYSCOHADA mapping assistant
- Automatic regulatory reports
- Tax localization by country
- OHADA controls engine

Create finance cockpit.

--------------------------------------------------

2. Public Sector / Government
Native government ERP layer:

- Budget execution
- Procurement compliance
- Public accounting
- Program budgeting
- Donor funding management
- Treasury controls
- Grants management
- Public expenditure monitoring

Create government control tower.

--------------------------------------------------

3. Procurement & Supplier Ecosystem
- Purchase management
- Supplier portal
- Tender management
- Contract management
- Spend analytics

--------------------------------------------------

4. HR / Payroll Africa
Build localized HR:
- Payroll
- Leave
- Time
- Local labor compliance
- Multi-country payroll rules

--------------------------------------------------

5. CRM + Sales
- Opportunities
- Sales pipeline
- Customer management
- Billing
- Subscription management

--------------------------------------------------

6. Inventory + Distribution
- Warehousing
- Multi-site stock
- Distribution operations
- Logistics

--------------------------------------------------

7. Projects + NGO Program Management
Special NGO layer:
- Program management
- Grant tracking
- Results frameworks
- Donor reporting
- M&E dashboards

--------------------------------------------------

8. BI / Executive Intelligence
Create executive decision cockpit:

- National dashboards
- Enterprise KPIs
- Financial analytics
- Predictive insights
- Executive control tower

==================================================
UX ARCHITECTURE
==================================================

Global shell:
Topbar:
- Universal search
- Country selector
- Entity selector
- Fiscal year
- Notifications
- AI assistant

Sidebar:
Three operating modes:
- Essential
- Advanced
- Expert

Workspaces:
- List + detail
- Split-pane ERP workbench
- Inspector panels
- Wizards
- Analytics boards

==================================================
AFRICAN-SPECIFIC INNOVATION
==================================================

Include innovation modules:

- Mobile money integration
- Banking integrations
- Multi-currency African operations
- Informal sector support
- Low connectivity mode
- USSD/light interfaces for some workflows
- Digital identity integration
- Regional trade support

Support:
UEMOA
ECOWAS
CEMAC
OHADA countries

==================================================
AI LAYER
==================================================

Include embedded AI assistant:
- accounting anomaly detection
- smart reconciliations
- budget forecasting
- document extraction
- compliance assistant
- natural language reporting

==================================================
DESIGN SYSTEM
==================================================

Generate:
- Enterprise component system
- African enterprise visual identity
- Typography system
- Color tokens
- Data grid patterns
- ERP UI kit
- Design tokens

Support:
light and dark mode.

==================================================
OUTPUT REQUIRED
==================================================

Produce:
1 Full ERP product architecture
2 Figma-ready module mockups
3 Full screen-by-screen product wireframes
4 React + Tailwind architecture
5 Navigation map
6 Database domain model suggestions
7 Design system
8 UX flows
9 Dashboard concepts
10 Premium SaaS prototype direction

Important:
This should look like a category-defining African enterprise software platform, not a localized clone of western ERP.

Think:
"Oracle Fusion for Africa, built natively for OHADA economies."
```

### Bonus — ERP souverain / gouvernement

Ajouter au prompt ci-dessus si besoin :

```
Add sovereign digital infrastructure capabilities:
- e-government interoperability
- tax authority integration
- treasury interoperability
- procurement transparency
- national data governance layer
```

### Idées de naming produit

AfriERP, OHADA One, Khepera ERP, BaobabOS, Ubuntu Enterprise, Nuru ERP, Sahel Fusion.

---

## Utilisation dans COYA

1. Ouvrir une session **Agent** dans Cursor sur `coya-pro/components/Finance.tsx` (ou un nouveau module `FinanceModuleV2`).  
2. Coller d’abord le **prompt 1** pour le shell + plan comptable OHADA.  
3. Itérer avec le **prompt 2** pour cohérence multi-modules si l’ERP s’élargit.  
4. Réserver le **prompt 3** pour une roadmap « Africa-first » (conformité, mobile money, secteur public).  

Pour un **MVP technique** (schéma DB, APIs), demander explicitement à Cursor une section supplémentaire : *« Produce Postgres schema draft + REST resource map for Finance/OHADA core only. »*
